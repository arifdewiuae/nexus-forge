import { describe, it, expect, vi } from 'vitest'
import { applyAction } from './applier'

interface Node { id: string; x: number; y: number; label: string; parent: string | null }

/**
 * Builds the two store seams the applier needs: a graph-mutation store and an
 * AI highlight store, plus inspection accessors for assertions.
 */
function makeStores(nodes: Node[] = []) {
  const _nodes = [...nodes]
  const highlighted: string[][] = []
  const layout: { id: string; x: number; y: number }[][] = []
  let editingId: string | null = null
  const crossLinks: { fromId: string; toId: string }[] = []
  const labelMap: Record<string, string> = {}

  const graph = {
    get nodes() { return _nodes },
    get editingId() { return editingId },
    set editingId(v: string | null) { editingId = v },
    selectedId: null as string | null,
    nodeById: (id: string) => _nodes.find(n => n.id === id) ?? null,
    addNodeAt: (parentId: string, x: number, y: number, label: string) => {
      const id = `new-${_nodes.length}`
      _nodes.push({ id, label, parent: parentId, x, y })
      return id
    },
    addChild: (parentId: string, label: string) => {
      const id = `new-${_nodes.length}`
      _nodes.push({ id, label, parent: parentId, x: 0, y: 0 })
      editingId = id
      return id
    },
    addCrossLink: (fromId: string, toId: string) => { crossLinks.push({ fromId, toId }) },
    reparent: () => true,
    setLabel: (id: string, label: string) => { labelMap[id] = label },
    applyLayout: (positions: { id: string; x: number; y: number }[]) => { layout.push(positions) },
  }

  const ai = {
    setHighlighted: (ids: string[]) => { highlighted.push(ids) },
    clearHighlights: vi.fn(),
  }

  return { graph, ai, _highlighted: highlighted, _layout: layout, _crossLinks: crossLinks, _labelMap: labelMap }
}

describe('applyAction', () => {
  it('add_node: adds a child to existing parent', () => {
    const s = makeStores([{ id: 'root', label: 'Root', parent: null, x: 0, y: 0 }])
    applyAction(s.graph, s.ai, { kind: 'add_node', label: 'New', parentId: 'root' })
    expect(s.graph.nodes).toHaveLength(2)
    expect(s.graph.nodes[1]!.label).toBe('New')
    expect(s.graph.nodes[1]!.parent).toBe('root')
  })

  it('add_node: does nothing when parent does not exist', () => {
    const s = makeStores([])
    applyAction(s.graph, s.ai, { kind: 'add_node', label: 'Orphan', parentId: 'ghost' })
    expect(s.graph.nodes).toHaveLength(0)
  })

  it('link_nodes: adds a cross link', () => {
    const s = makeStores([
      { id: 'a', label: 'A', parent: null, x: 0, y: 0 },
      { id: 'b', label: 'B', parent: null, x: 0, y: 0 },
    ])
    applyAction(s.graph, s.ai, { kind: 'link_nodes', fromId: 'a', toId: 'b' })
    expect(s._crossLinks).toEqual([{ fromId: 'a', toId: 'b' }])
  })

  it('relabel: updates the label', () => {
    const s = makeStores([{ id: 'a', label: 'Old', parent: null, x: 0, y: 0 }])
    applyAction(s.graph, s.ai, { kind: 'relabel', nodeId: 'a', label: 'New Label' })
    expect(s._labelMap['a']).toBe('New Label')
  })

  it('highlight: calls setHighlighted and schedules clearHighlights', () => {
    vi.useFakeTimers()
    const s = makeStores()
    applyAction(s.graph, s.ai, { kind: 'highlight', nodeIds: ['a', 'b'], reason: 'test' })
    expect(s._highlighted).toEqual([['a', 'b']])
    vi.advanceTimersByTime(4000)
    expect(s.ai.clearHighlights).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })

  it('expand_branch: adds all children and clears editingId', () => {
    const s = makeStores([{ id: 'root', label: 'Root', parent: null, x: 0, y: 0 }])
    applyAction(s.graph, s.ai, {
      kind: 'expand_branch',
      parentId: 'root',
      children: [{ label: 'Child A' }, { label: 'Child B' }],
    })
    expect(s.graph.nodes).toHaveLength(3)
    expect(s.graph.nodes.map(n => n.label)).toContain('Child A')
    expect(s.graph.nodes.map(n => n.label)).toContain('Child B')
    expect(s.graph.editingId).toBeNull()
  })

  it('expand_branch: does nothing when parent does not exist', () => {
    const s = makeStores([])
    applyAction(s.graph, s.ai, { kind: 'expand_branch', parentId: 'ghost', children: [{ label: 'X' }] })
    expect(s.graph.nodes).toHaveLength(0)
  })

  it('tidy_layout: calls applyLayout with radial positions', () => {
    const s = makeStores([
      { id: 'r', label: 'Root', parent: null, x: 0, y: 0 },
      { id: 'a', label: 'A', parent: 'r', x: 0, y: 0 },
    ])
    applyAction(s.graph, s.ai, { kind: 'tidy_layout' })
    expect(s._layout).toHaveLength(1)
    expect(s._layout[0]).toHaveLength(2)
    const rootPos = s._layout[0]!.find(p => p.id === 'r')!
    expect(rootPos.x).toBe(0)
    expect(rootPos.y).toBe(0)
  })
})
