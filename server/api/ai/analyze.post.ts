import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runMindMapAnalysis } from '~/lib/ai/graph'
import type { BoardStreamEvent, SerializedGraph, AgentPersona } from '~/lib/ai/types'

interface RequestBody {
  graph: SerializedGraph
  agent?: AgentPersona | null
  userPrompt?: string
}

function getApiKey(runtimeKey: string): string {
  if (runtimeKey) return runtimeKey
  if (process.env.FIREWORKS_API_KEY) return process.env.FIREWORKS_API_KEY
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
    const match = content.match(/^FIREWORKS_API_KEY=(.+)$/m)
    if (match) return match[1].trim()
  } catch {}
  return ''
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const apiKey = getApiKey(config.fireworksApiKey)

  if (!apiKey) {
    throw createError({ statusCode: 500, message: 'FIREWORKS_API_KEY is not configured on the server.' })
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
