import { describe, it, expect, vi, beforeEach } from 'vitest'
import { applyAction } from './applier'
import type { MindMapAction } from '~/lib/ai/types'

interface Node { id: string; x: number; y: number; label: string; parent: string | null }

function makeStore(nodes: Node[] = []) {
  const _nodes = [...nodes]
  const highlighted: string[][] = []
  const layout: { id: string; x: number; y: number }[][] = []
  let editingId: string | null = null
  let selectedId: string | null = null
  const crossLinks: { fromId: string; toId: string }[] = []
  let labelMap: Record<string, string> = {}

  return {
    get nodes() { return _nodes },
    get editingId() { return editingId },
    set editingId(v) { editingId = v },
    selectedId,
    nodeById: (id: string) => _nodes.find(n => n.id === id) ?? null,
    addChild: (parentId: string, label: string) => {
      const id = `new-${_nodes.length}`
      _nodes.push({ id, label, parent: parentId, x: 0, y: 0 })
      editingId = id
      return id
    },
    addCrossLink: (fromId: string, toId: string) => { crossLinks.push({ fromId, toId }) },
    setLabel: (id: string, label: string) => { labelMap[id] = label },
    setHighlighted: (ids: string[]) => { highlighted.push(ids) },
    clearHighlights: vi.fn(),
    applyLayout: (positions: { id: string; x: number; y: number }[]) => { layout.push(positions) },
    _highlighted: highlighted,
    _layout: layout,
    _crossLinks: crossLinks,
    _labelMap: labelMap,
  }
}

describe('applyAction', () => {
  it('add_node: adds a child to existing parent', () => {
    const store = makeStore([{ id: 'root', label: 'Root', parent: null, x: 0, y: 0 }])
    applyAction(store, { kind: 'add_node', label: 'New', parentId: 'root' })
    expect(store.nodes).toHaveLength(2)
    expect(store.nodes[1].label).toBe('New')
    expect(store.nodes[1].parent).toBe('root')
  })

  it('add_node: does nothing when parent does not exist', () => {
    const store = makeStore([])
    applyAction(store, { kind: 'add_node', label: 'Orphan', parentId: 'ghost' })
    expect(store.nodes).toHaveLength(0)
  })

  it('link_nodes: adds a cross link', () => {
    const store = makeStore([
      { id: 'a', label: 'A', parent: null, x: 0, y: 0 },
      { id: 'b', label: 'B', parent: null, x: 0, y: 0 },
    ])
    applyAction(store, { kind: 'link_nodes', fromId: 'a', toId: 'b' })
    expect(store._crossLinks).toEqual([{ fromId: 'a', toId: 'b' }])
  })

  it('relabel: updates the label', () => {
    const store = makeStore([{ id: 'a', label: 'Old', parent: null, x: 0, y: 0 }])
    applyAction(store, { kind: 'relabel', nodeId: 'a', label: 'New Label' })
    expect(store._labelMap['a']).toBe('New Label')
  })

  it('highlight: calls setHighlighted and schedules clearHighlights', () => {
    vi.useFakeTimers()
    const store = makeStore()
    applyAction(store, { kind: 'highlight', nodeIds: ['a', 'b'], reason: 'test' })
    expect(store._highlighted).toEqual([['a', 'b']])
    vi.advanceTimersByTime(4000)
    expect(store.clearHighlights).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })

  it('expand_branch: adds all children and clears editingId', () => {
    const store = makeStore([{ id: 'root', label: 'Root', parent: null, x: 0, y: 0 }])
    applyAction(store, {
      kind: 'expand_branch',
      parentId: 'root',
      children: [{ label: 'Child A' }, { label: 'Child B' }],
    })
    expect(store.nodes).toHaveLength(3)
    expect(store.nodes.map(n => n.label)).toContain('Child A')
    expect(store.nodes.map(n => n.label)).toContain('Child B')
    expect(store.editingId).toBeNull()
  })

  it('expand_branch: does nothing when parent does not exist', () => {
    const store = makeStore([])
    applyAction(store, { kind: 'expand_branch', parentId: 'ghost', children: [{ label: 'X' }] })
    expect(store.nodes).toHaveLength(0)
  })

  it('tidy_layout: calls applyLayout with radial positions', () => {
    const store = makeStore([
      { id: 'r', label: 'Root', parent: null, x: 0, y: 0 },
      { id: 'a', label: 'A', parent: 'r', x: 0, y: 0 },
    ])
    applyAction(store, { kind: 'tidy_layout' })
    expect(store._layout).toHaveLength(1)
    expect(store._layout[0]).toHaveLength(2)
    const rootPos = store._layout[0].find(p => p.id === 'r')!
    expect(rootPos.x).toBe(0)
    expect(rootPos.y).toBe(0)
  })
})
