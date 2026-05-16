import type { MindMapNode, SerializedGraph, SerializedNode } from '~/lib/ai/types'

function ancestorsOf(nodes: MindMapNode[], id: string): MindMapNode[] {
  const out: MindMapNode[] = []
  let current: MindMapNode | undefined = nodes.find(n => n.id === id)
  let guard = 0
  while (current && current.parent && guard++ < 50) {
    const p = nodes.find(n => n.id === current!.parent)
    if (!p) break
    out.unshift(p)
    current = p
  }
  return out
}

export function serializeGraph(
  nodes: MindMapNode[],
  title: string
): SerializedGraph {
  const serialized: SerializedNode[] = nodes.map(n => {
    const childCount = nodes.filter(c => c.parent === n.id).length
    const level = ancestorsOf(nodes, n.id).length
    return {
      id: n.id,
      label: n.label,
      parentId: n.parent,
      childCount,
      level,
      x: Math.round(n.x),
      y: Math.round(n.y),
    }
  })

  return {
    title,
    nodeCount: nodes.length,
    nodes: serialized,
  }
}
