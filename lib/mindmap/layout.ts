import type { MindMapNode } from '~/lib/ai/types'

export interface NodePosition { id: string; x: number; y: number }

const RADII = [0, 420, 300, 210, 155, 120]
const radiusAt = (level: number) => level < RADII.length ? RADII[level] : 100

export function computeRadialLayout(nodes: MindMapNode[]): NodePosition[] {
  const root = nodes.find(n => !n.parent)
  if (!root) return nodes.map(n => ({ id: n.id, x: 0, y: 0 }))

  const childrenOf = new Map<string, MindMapNode[]>()
  for (const n of nodes) {
    if (!childrenOf.has(n.id)) childrenOf.set(n.id, [])
    if (n.parent) {
      if (!childrenOf.has(n.parent)) childrenOf.set(n.parent, [])
      childrenOf.get(n.parent)!.push(n)
    }
  }

  function leafCount(id: string): number {
    const ch = childrenOf.get(id) ?? []
    return ch.length === 0 ? 1 : ch.reduce((s, c) => s + leafCount(c.id), 0)
  }

  const positions = new Map<string, { x: number; y: number }>()
  positions.set(root.id, { x: 0, y: 0 })

  function place(id: string, level: number, minAngle: number, maxAngle: number) {
    const children = childrenOf.get(id) ?? []
    if (!children.length) return
    const parent = positions.get(id)!
    const totalLeaves = children.reduce((s, c) => s + leafCount(c.id), 0)
    const r = radiusAt(level)
    let cursor = minAngle
    for (const child of children) {
      const fraction = leafCount(child.id) / totalLeaves
      const sector = (maxAngle - minAngle) * fraction
      const mid = cursor + sector / 2
      positions.set(child.id, {
        x: Math.round(parent.x + r * Math.cos(mid)),
        y: Math.round(parent.y + r * Math.sin(mid)),
      })
      // Recurse with slightly tighter sector so deep nodes don't crowd
      const margin = sector * 0.08
      place(child.id, level + 1, mid - sector / 2 + margin, mid + sector / 2 - margin)
      cursor += sector
    }
  }

  place(root.id, 1, 0, 2 * Math.PI)

  return nodes.map(n => {
    const p = positions.get(n.id) ?? { x: 0, y: 0 }
    return { id: n.id, x: p.x, y: p.y }
  })
}
