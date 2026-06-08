import { describe, it, expect } from 'vitest'
import { serializeGraph } from './serializer'
import type { MindMapNode, CrossLink } from '~/lib/ai/types'

const node = (id: string, label: string, parent: string | null = null): MindMapNode =>
  ({ id, label, parent, x: 0, y: 0 })

describe('serializeGraph', () => {
  it('handles empty nodes', () => {
    const g = serializeGraph([], 'empty', [])
    expect(g.nodeCount).toBe(0)
    expect(g.nodes).toEqual([])
    expect(g.title).toBe('empty')
    expect(g.links).toBeUndefined()
  })

  it('serializes a single root node', () => {
    const g = serializeGraph([node('root', 'Root')], 'test', [])
    expect(g.nodeCount).toBe(1)
    expect(g.nodes[0]).toMatchObject({ id: 'root', label: 'Root', parentId: null, childCount: 0, level: 0 })
  })

  it('computes childCount correctly', () => {
    const nodes = [node('r', 'Root'), node('a', 'A', 'r'), node('b', 'B', 'r'), node('c', 'C', 'a')]
    const g = serializeGraph(nodes, 't', [])
    const root = g.nodes.find(n => n.id === 'r')!
    const a = g.nodes.find(n => n.id === 'a')!
    const b = g.nodes.find(n => n.id === 'b')!
    expect(root.childCount).toBe(2)
    expect(a.childCount).toBe(1)
    expect(b.childCount).toBe(0)
  })

  it('computes level correctly', () => {
    const nodes = [node('r', 'Root'), node('a', 'A', 'r'), node('b', 'B', 'a')]
    const g = serializeGraph(nodes, 't', [])
    expect(g.nodes.find(n => n.id === 'r')!.level).toBe(0)
    expect(g.nodes.find(n => n.id === 'a')!.level).toBe(1)
    expect(g.nodes.find(n => n.id === 'b')!.level).toBe(2)
  })

  it('rounds x and y to integers', () => {
    const nodes = [{ id: 'r', label: 'Root', parent: null, x: 1.7, y: 2.3 }]
    const g = serializeGraph(nodes, 't', [])
    expect(g.nodes[0]!.x).toBe(2)
    expect(g.nodes[0]!.y).toBe(2)
  })

  it('includes cross links when present', () => {
    const nodes = [node('r', 'Root'), node('a', 'A', 'r'), node('b', 'B', 'r')]
    const links: CrossLink[] = [{ id: 'l1', fromId: 'a', toId: 'b' }]
    const g = serializeGraph(nodes, 't', links)
    expect(g.links).toEqual([{ fromId: 'a', toId: 'b' }])
  })

  it('omits links key when no cross links', () => {
    const g = serializeGraph([node('r', 'Root')], 't', [])
    expect(g.links).toBeUndefined()
  })
})
