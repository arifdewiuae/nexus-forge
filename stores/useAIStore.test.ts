// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'

vi.stubGlobal('import.meta.client', true)
vi.mock('#app', () => ({}))
vi.mock('#imports', () => ({}))

const { useAIStore } = await import('./useAIStore')
const { AGENTS } = await import('~/lib/ai/types')

const VALID_AGENT = AGENTS[0]!.id

describe('useAIStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  describe('panel visibility', () => {
    it('opens and closes the AI panel', () => {
      const ai = useAIStore()
      expect(ai.isAIPanelOpen).toBe(false)
      ai.openAIPanel()
      expect(ai.isAIPanelOpen).toBe(true)
      ai.closeAIPanel()
      expect(ai.isAIPanelOpen).toBe(false)
    })
  })

  describe('streaming accumulation', () => {
    it('appendThinking concatenates chunks', () => {
      const ai = useAIStore()
      ai.appendThinking('Hello ')
      ai.appendThinking('world')
      expect(ai.streamingThinking).toBe('Hello world')
    })

    it('addSuggestion pushes onto the list', () => {
      const ai = useAIStore()
      ai.addSuggestion({ kind: 'tidy_layout' })
      ai.addSuggestion({ kind: 'relabel', nodeId: 'n1', label: 'x' })
      expect(ai.suggestions).toHaveLength(2)
      expect(ai.suggestions[0]).toEqual({ kind: 'tidy_layout' })
    })
  })

  describe('highlights', () => {
    it('setHighlighted replaces the set; clearHighlights empties it', () => {
      const ai = useAIStore()
      ai.setHighlighted(['a', 'b'])
      expect(ai.highlightedIds.has('a')).toBe(true)
      expect(ai.highlightedIds.size).toBe(2)
      ai.setHighlighted(['c'])
      expect(ai.highlightedIds.has('a')).toBe(false)
      expect(ai.highlightedIds.has('c')).toBe(true)
      ai.clearHighlights()
      expect(ai.highlightedIds.size).toBe(0)
    })
  })

  describe('agents', () => {
    it('setAgent accepts a known id and reflects it in activeAgent', () => {
      const ai = useAIStore()
      ai.setAgent(VALID_AGENT)
      expect(ai.agentId).toBe(VALID_AGENT)
      expect(ai.activeAgent?.id).toBe(VALID_AGENT)
    })

    it('setAgent ignores an unknown id', () => {
      const ai = useAIStore()
      ai.setAgent('not-a-real-agent')
      expect(ai.agentId).toBe('')
      expect(ai.activeAgent).toBeNull()
    })

    it('persists the agent id to localStorage', async () => {
      const ai = useAIStore()
      ai.setAgent(VALID_AGENT)
      await nextTick()
      expect(localStorage.getItem('nf:agent:id')).toBe(VALID_AGENT)
    })

    it('hydrateAgentFromStorage restores a valid stored id', () => {
      localStorage.setItem('nf:agent:id', VALID_AGENT)
      const ai = useAIStore()
      ai.hydrateAgentFromStorage()
      expect(ai.agentId).toBe(VALID_AGENT)
    })

    it('hydrateAgentFromStorage ignores a stale/invalid stored id', () => {
      localStorage.setItem('nf:agent:id', 'ghost-agent')
      const ai = useAIStore()
      ai.hydrateAgentFromStorage()
      expect(ai.agentId).toBe('')
    })
  })

  describe('clearAnalysis', () => {
    it('resets streaming state and removes the cached result', () => {
      const ai = useAIStore()
      ai.appendThinking('thinking…')
      ai.addSuggestion({ kind: 'tidy_layout' })
      ai.setHighlighted(['a'])
      ai.analysisResult = { thinking: 't', suggestions: [], tokensUsed: 1, costUsd: 0, latencyMs: 1 }
      ai.clearAnalysis()
      expect(ai.streamingThinking).toBe('')
      expect(ai.suggestions).toHaveLength(0)
      expect(ai.analysisResult).toBeNull()
      expect(ai.highlightedIds.size).toBe(0)
      expect(localStorage.getItem('nf:ai:result')).toBeNull()
    })
  })

  describe('result caching', () => {
    it('writes analysisResult to localStorage and rehydrates on a fresh store', async () => {
      const ai = useAIStore()
      const result = { thinking: 'done', suggestions: [], tokensUsed: 42, costUsd: 0.001, latencyMs: 900 }
      ai.analysisResult = result
      await nextTick()
      expect(JSON.parse(localStorage.getItem('nf:ai:result')!)).toEqual(result)

      setActivePinia(createPinia())
      const ai2 = useAIStore()
      expect(ai2.analysisResult).toEqual(result)
      expect(ai2.streamingThinking).toBe('done')
    })
  })
})
