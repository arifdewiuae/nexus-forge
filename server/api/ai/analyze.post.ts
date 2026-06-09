import { randomUUID } from 'node:crypto'
import { runMindMapAnalysis } from '~/lib/ai/graph'
import type { BoardStreamEvent, AnalyzeRequest } from '~/lib/ai/types'
import { AnalyzeRequestSchema } from '~/lib/ai/schemas'
import { checkModeration } from '~/lib/ai/moderation'
import { HEADER_FIREWORKS_KEY, RATE_LIMIT, VALIDATION } from '~/lib/config'
import { checkRateLimitAsync } from '~/server/utils/rateLimit'
import { openSseStream } from '~/server/utils/sse'

/** H3 event type, derived without importing h3 (matches the rest of server/). */
type ApiEvent = Parameters<typeof getHeader>[0]

/** The request's API key: caller's own key, or the server demo key when enabled. */
function resolveApiKey(userKey: string, runtimeKey: string, demoEnabled: boolean): string {
  if (userKey) return userKey
  if (demoEnabled && runtimeKey) return runtimeKey
  return ''
}

/** Best-effort client IP for the rate-limit bucket. */
function clientIp(event: ApiEvent): string {
  return getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    ?? event.node.req.socket?.remoteAddress
    ?? 'unknown'
}

/**
 * Two-tier rate limit: own-key callers get a looser budget than the shared demo
 * key (our spend). Sets the X-RateLimit-* headers; throws 429 (+ Retry-After) when over.
 */
async function enforceRateLimit(event: ApiEvent, userKey: string): Promise<void> {
  const rateLimitKey = userKey ? `key:${userKey.slice(-VALIDATION.RATE_LIMIT_KEY_SUFFIX_LEN)}` : `ip:${clientIp(event)}`
  const limit = userKey ? RATE_LIMIT.OWN_MAX_REQUESTS : RATE_LIMIT.DEMO_MAX_REQUESTS
  const { allowed, remaining, retryAfterSec } = await checkRateLimitAsync(rateLimitKey, limit)

  setResponseHeader(event, 'X-RateLimit-Limit', String(limit))
  setResponseHeader(event, 'X-RateLimit-Remaining', String(remaining))

  if (!allowed) {
    setResponseHeader(event, 'Retry-After', retryAfterSec)
    throw createError({ statusCode: 429, message: 'Too many requests. Try again later.' })
  }
}

/**
 * Read + validate the body before a token is generated: null-byte scan, hard
 * size cap, Zod shape, and a non-empty-input check. Returns typed data or throws 400.
 */
async function validateAnalyzeRequest(event: ApiEvent): Promise<AnalyzeRequest> {
  const raw = await readBody<unknown>(event)
  const serialized = JSON.stringify(raw)

  if (serialized.includes('\u0000')) {
    throw createError({ statusCode: 400, message: 'Request contains invalid characters.' })
  }
  if (serialized.length > VALIDATION.PAYLOAD_MAX_BYTES) {
    throw createError({ statusCode: 400, message: 'Mind map is too large to analyze (max 50 KB).' })
  }

  const parsed = AnalyzeRequestSchema.safeParse(raw)

  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw createError({ statusCode: 400, message: `Invalid request: ${issues}` })
  }
  if (parsed.data.graph.nodeCount === 0 && !parsed.data.userPrompt?.trim()) {
    throw createError({ statusCode: 400, message: 'Add some nodes or write a prompt before asking AI.' })
  }
  return parsed.data
}

/** Structured request log line for correlation / log archaeology. */
function logAnalyzeRequest(requestId: string, req: AnalyzeRequest, userKey: string): void {
  console.info(JSON.stringify({
    tag: 'ai.analyze', requestId, nodeCount: req.graph.nodeCount,
    agent: req.agent?.id ?? null, tier: userKey ? 'own' : 'demo',
  }))
}

/**
 * Moderate prompt + node labels (after rate-limit, before the LLM). On a block,
 * emits an SSE `error` frame and returns true so the caller stops — the block is
 * a stream frame, not a 4xx, keeping the client on one code path.
 */
async function isBlockedByModeration(
  send: (event: BoardStreamEvent) => void,
  req: AnalyzeRequest,
): Promise<boolean> {
  const text = [req.userPrompt ?? '', ...req.graph.nodes.map(node => node.label)].join('\n')
  const moderation = await checkModeration(text, process.env.OPENAI_API_KEY)
  if (!moderation.blocked) return false
  send({ type: 'error', message: moderation.reason ?? 'Your request was blocked by content moderation.' })
  return true
}

/**
 * SSE route. Policy pipeline runs first and short-circuits with a normal HTTP
 * status; once the stream is open, failures (moderation, model) surface as SSE
 * `error` frames so the client stays on a single code path.
 */
export default defineEventHandler(async (event) => {
  const userKey = getHeader(event, HEADER_FIREWORKS_KEY)?.trim() ?? ''
  const apiKey = resolveApiKey(userKey, process.env.FIREWORKS_API_KEY ?? '', process.env.DEMO_KEYS_ENABLED === 'true')
  if (!apiKey) {
    throw createError({ statusCode: 401, message: 'No API key configured. Add your Fireworks key in Settings (⚙ keys).' })
  }

  await enforceRateLimit(event, userKey)
  const req = await validateAnalyzeRequest(event)

  const requestId = randomUUID()
  setResponseHeader(event, 'X-Request-Id', requestId)   // echoed to the client for support
  logAnalyzeRequest(requestId, req, userKey)

  const stream = openSseStream<BoardStreamEvent>(event)
  try {
    if (await isBlockedByModeration(stream.send, req)) return
    await runMindMapAnalysis(req.graph, req.agent ?? null, req.userPrompt ?? '', apiKey, stream.send, stream.signal)
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return
    stream.send({ type: 'error', message: err instanceof Error ? err.message : 'Analysis failed unexpectedly.' })
  } finally {
    stream.close()
  }
})
