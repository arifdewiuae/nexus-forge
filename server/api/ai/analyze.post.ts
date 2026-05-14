import { runBoardAnalysis } from '~/lib/ai/graph'
import type { BoardStreamEvent, SerializedBoard } from '~/lib/ai/types'

interface RequestBody {
  boardJson: SerializedBoard
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const apiKey = config.fireworksApiKey

  if (!apiKey) {
    throw createError({ statusCode: 500, message: 'FIREWORKS_API_KEY is not configured on the server.' })
  }

  const body = await readBody<RequestBody>(event)

  if (!body?.boardJson) {
    throw createError({ statusCode: 400, message: 'Missing boardJson in request body.' })
  }

  const { boardJson } = body

  if (boardJson.objectCount === 0) {
    throw createError({ statusCode: 400, message: 'The board has no objects to analyze.' })
  }

  // Cap board payload to prevent token blowup
  if (JSON.stringify(boardJson).length > 50_000) {
    throw createError({ statusCode: 400, message: 'Board is too large to analyze (max 50 KB).' })
  }

  setResponseHeaders(event, {
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  function send(data: BoardStreamEvent): void {
    event.node.res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    await runBoardAnalysis(boardJson, apiKey, send)
  } catch (err) {
    send({
      type: 'error',
      message: err instanceof Error ? err.message : 'Analysis failed unexpectedly.',
    })
  } finally {
    event.node.res.end()
  }
})
