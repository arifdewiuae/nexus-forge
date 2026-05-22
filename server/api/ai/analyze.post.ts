import { runMindMapAnalysis } from '~/lib/ai/graph'
import type { BoardStreamEvent } from '~/lib/ai/types'
import { AnalyzeRequestSchema } from '~/lib/ai/schemas'
import { HEADER_FIREWORKS_KEY } from '~/lib/config'
import { checkRateLimitAsync } from '~/server/utils/rateLimit'

function resolveApiKey(
  event: Parameters<typeof getHeader>[0],
  runtimeKey: string,
  demoEnabled: boolean,
): string {
  const headerKey = getHeader(event, HEADER_FIREWORKS_KEY)?.trim()
  if (headerKey) return headerKey
  if (demoEnabled && runtimeKey) return runtimeKey
  return ''
}

export default defineEventHandler(async (event) => {
  const userKey = getHeader(event, HEADER_FIREWORKS_KEY)?.trim() ?? ''
  const apiKey = resolveApiKey(event, process.env.FIREWORKS_API_KEY ?? '', process.env.DEMO_KEYS_ENABLED === 'true')

  if (!apiKey) {
    throw createError({ statusCode: 401, message: 'No API key configured. Add your Fireworks key in Settings (⚙ keys).' })
  }

  const ip = getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    ?? event.node.req.socket?.remoteAddress
    ?? 'unknown'
  const rateLimitKey = userKey ? `key:${userKey.slice(-8)}` : `ip:${ip}`
  const { allowed, remaining } = await checkRateLimitAsync(rateLimitKey)
  setResponseHeader(event, 'X-RateLimit-Remaining', String(remaining))
  if (!allowed) {
    throw createError({ statusCode: 429, message: 'Too many requests. Try again in an hour.' })
  }

  const raw = await readBody<unknown>(event)

  // Hard cap on raw payload size before Zod parse
  const serialized = JSON.stringify(raw)
  if (serialized.includes('\u0000')) {
    throw createError({ statusCode: 400, message: 'Request contains invalid characters.' })
  }
  if (serialized.length > 50_000) {
    throw createError({ statusCode: 400, message: 'Mind map is too large to analyze (max 50 KB).' })
  }

  const parsed = AnalyzeRequestSchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw createError({ statusCode: 400, message: `Invalid request: ${issues}` })
  }

  const { graph, agent, userPrompt } = parsed.data

  if (graph.nodeCount === 0 && !userPrompt?.trim()) {
    throw createError({ statusCode: 400, message: 'Add some nodes or write a prompt before asking AI.' })
  }

  setResponseHeaders(event, {
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache, no-transform',
    'Connection':        'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const abortController = new AbortController()
  event.node.req.on('close', () => abortController.abort())

  function send(data: BoardStreamEvent): void {
    event.node.res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    await runMindMapAnalysis(graph, agent ?? null, userPrompt ?? '', apiKey, send, abortController.signal)
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return
    send({ type: 'error', message: err instanceof Error ? err.message : 'Analysis failed unexpectedly.' })
  } finally {
    event.node.res.end()
  }
})
