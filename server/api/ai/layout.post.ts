import { computeRadialLayout } from '~/lib/mindmap/layout'
import type { MindMapNode } from '~/lib/ai/types'

interface RequestBody { nodes: MindMapNode[] }

export default defineEventHandler(async (event) => {
  const body = await readBody<RequestBody>(event)
  if (!body?.nodes) {
    throw createError({ statusCode: 400, message: 'Missing nodes in request body.' })
  }

  const positions = computeRadialLayout(body.nodes)
  return { positions }
})
