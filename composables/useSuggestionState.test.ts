import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive, nextTick } from 'vue'
import { useSuggestionState } from './useSuggestionState'
import type { MindMapAction } from '~/lib/ai/types'

function makeStores() {
  const graph = {
    undo: vi.fn(),
    nodeById: (id: string) => ({ id, x: 0, y: 0, label: id, parent: null }),
    addChild: vi.fn(),
    addNodeAt: vi.fn(),
    addCrossLink: vi.fn(),
    setLabel: vi.fn(),
    reparent: vi.fn(),
    applyLayout: vi.fn(),
    editingId: null as string | null,
    selectedId: null as string | null,
    nodes: [] as { id: string; x: number; y: number; label: string; parent: string | null }[],
  }
  const ai = reactive({
    suggestions: [] as MindMapAction[],
    setHighlighted: vi.fn(),
    clearHighlights: vi.fn(),
  })
  // `as never` — the test seams satisfy the structural subset the composable uses.
  return { graph: graph as never, ai: ai as never, _graph: graph, _ai: ai }
}

describe('useSuggestionState', () => {
  beforeEach(() => vi.clearAllMocks())

  it('apply() marks the index applied and mutates the graph', () => {
    const s = makeStores()
    const { appliedSet, apply } = useSuggestionState(s.graph, s.ai)
    apply({ kind: 'tidy_layout' }, 0)
    expect(appliedSet.value.has(0)).toBe(true)
    expect(s._graph.applyLayout).toHaveBeenCalledOnce()
  })

  it('undo() calls graph.undo and clears the applied flag', () => {
    const s = makeStores()
    const { appliedSet, apply, undo } = useSuggestionState(s.graph, s.ai)
    apply({ kind: 'tidy_layout' }, 1)
    undo(1)
    expect(s._graph.undo).toHaveBeenCalledOnce()
    expect(appliedSet.value.has(1)).toBe(false)
  })

  it('reject() marks the index rejected', () => {
    const s = makeStores()
    const { rejectedSet, reject } = useSuggestionState(s.graph, s.ai)
    reject(2)
    expect(rejectedSet.value.has(2)).toBe(true)
  })

  it('resets applied/rejected sets when a new batch arrives (0 -> N)', async () => {
    const s = makeStores()
    const { appliedSet, rejectedSet, apply, reject } = useSuggestionState(s.graph, s.ai)
    apply({ kind: 'tidy_layout' }, 0)
    reject(1)
    expect(appliedSet.value.size).toBe(1)

    s._ai.suggestions.push({ kind: 'tidy_layout' }) // length 0 -> 1 triggers reset
    await nextTick()

    expect(appliedSet.value.size).toBe(0)
    expect(rejectedSet.value.size).toBe(0)
  })
})
