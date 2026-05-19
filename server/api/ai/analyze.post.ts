import { runMindMapAnalysis } from '~/lib/ai/graph'
import type { BoardStreamEvent, SerializedGraph, AgentPersona } from '~/lib/ai/types'
import { HEADER_FIREWORKS_KEY } from '~/lib/config'

interface RequestBody {
  graph: SerializedGraph
  agent?: AgentPersona | null
  userPrompt?: string
}

function resolveApiKey(event: Parameters<typeof getHeader>[0], runtimeKey: string): string {
  const headerKey = getHeader(event, HEADER_FIREWORKS_KEY)?.trim()
  if (headerKey) return headerKey

  if (process.env.DEMO_KEYS_ENABLED === 'true') {
    if (runtimeKey) return runtimeKey
    if (process.env.FIREWORKS_API_KEY) return process.env.FIREWORKS_API_KEY
  }

  return ''
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const apiKey = resolveApiKey(event, config.fireworksApiKey)

  if (!apiKey) {
    throw createError({ statusCode: 401, message: 'No API key configured. Add your Fireworks key in Settings (⚙ keys).' })
  }

  const body = await readBody<RequestBody>(event)

  if (!body?.graph) {
    throw createError({ statusCode: 400, message: 'Missing graph in request body.' })
  }

  const { graph, agent, userPrompt } = body

  if (graph.nodeCount === 0 && !userPrompt?.trim()) {
    throw createError({ statusCode: 400, message: 'Add some nodes or write a prompt before asking AI.' })
  }

  if (JSON.stringify(graph).length > 50_000) {
    throw createError({ statusCode: 400, message: 'Mind map is too large to analyze (max 50 KB).' })
  }

  setResponseHeaders(event, {
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache, no-transform',
    'Connection':        'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  function send(data: BoardStreamEvent): void {
    event.node.res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    await runMindMapAnalysis(graph, agent ?? null, userPrompt ?? '', apiKey, send)
  } catch (err) {
    send({ type: 'error', message: err instanceof Error ? err.message : 'Analysis failed unexpectedly.' })
  } finally {
    event.node.res.end()
  }
})
