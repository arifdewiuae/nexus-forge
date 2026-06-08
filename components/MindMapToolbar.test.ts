// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import MindMapToolbar from './MindMapToolbar.vue'

const hasKey = ref(true)
vi.mock('~/composables/useApiKeys', () => ({
  useApiKeys: () => ({ hasKey, fireworksKey: ref('fw-test') }),
}))

// Mutable stub stores shared per-test.
let graph: ReturnType<typeof makeGraph>

function makeGraph(over: Record<string, unknown> = {}) {
  return reactive({
    tool: 'select', linkFromId: null as string | null,
    canUndo: false, canRedo: false, isLayouting: false,
    undo: vi.fn(), redo: vi.fn(),
    ...over,
  })
}

beforeEach(() => {
  graph = makeGraph()
  vi.stubGlobal('useGraphStore', () => graph)
  vi.stubGlobal('useAIStore', () => reactive({ isAIPanelOpen: false, isAnalyzing: false, activeAgent: null }))
  vi.stubGlobal('useSettingsStore', () => reactive({ accentColor: '#c4604a', setAccent: vi.fn() }))
})

describe('MindMapToolbar', () => {
  it('renders all five canvas tools with aria-labels', () => {
    const w = mount(MindMapToolbar)
    for (const label of ['select tool (V)', '+ node tool (A)', '↗ branch tool (L)', '⤳ connect tool (C)', '✗ erase tool (E)']) {
      expect(w.find(`[aria-label="${label}"]`).exists()).toBe(true)
    }
  })

  it('selecting a tool updates the graph store tool', async () => {
    const w = mount(MindMapToolbar)
    await w.get('[aria-label="+ node tool (A)"]').trigger('click')
    expect(graph.tool).toBe('add')
  })

  it('marks the active tool', async () => {
    graph.tool = 'erase'
    const w = mount(MindMapToolbar)
    expect(w.get('[aria-label="✗ erase tool (E)"]').classes()).toContain('active')
  })

  it('emits analyze when the AI button is clicked', async () => {
    const w = mount(MindMapToolbar)
    await w.get('[aria-label="Ask AI to analyze map"]').trigger('click')
    expect(w.emitted('analyze')).toBeTruthy()
  })

  it('disables undo when there is no history', () => {
    const w = mount(MindMapToolbar)
    expect(w.get('[aria-label="Undo"]').attributes('disabled')).toBeDefined()
  })

  it('undo is enabled and fires when history exists', async () => {
    graph = makeGraph({ canUndo: true })
    vi.stubGlobal('useGraphStore', () => graph)
    const w = mount(MindMapToolbar)
    const undoBtn = w.get('[aria-label="Undo"]')
    expect(undoBtn.attributes('disabled')).toBeUndefined()
    await undoBtn.trigger('click')
    expect(graph.undo).toHaveBeenCalledOnce()
  })
})
