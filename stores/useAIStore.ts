/* =========================================================
   stores/useAIStore.ts — AI streaming state, agents, highlights
   ========================================================= */
import { defineStore, skipHydrate } from 'pinia'
import type { MindMapAction, AnalysisResult, AgentPersona } from '~/lib/ai/types'
import { AGENTS } from '~/lib/ai/types'

const AI_CACHE_KEY = 'nf:ai:result'
const AGENT_KEY    = 'nf:agent:id'

function loadAnalysisResult(): AnalysisResult | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(AI_CACHE_KEY)
    return raw ? JSON.parse(raw) as AnalysisResult : null
  } catch { return null }
}

export const useAIStore = defineStore('ai', () => {
  const isAnalyzing       = ref(false)
  const isAIPanelOpen     = ref(false)
  const userPrompt        = ref('')
  const highlightedIds    = ref<Set<string>>(new Set())
  const cachedResult      = loadAnalysisResult()
  const streamingThinking = ref(cachedResult?.thinking ?? '')
  const suggestions       = ref<MindMapAction[]>(cachedResult?.suggestions ?? [])
  const analysisResult    = ref<AnalysisResult | null>(cachedResult)

  const agentId = ref<string>(
    import.meta.client ? (localStorage.getItem(AGENT_KEY) ?? '') : ''
  )
  const activeAgent = computed<AgentPersona | null>(
    () => AGENTS.find(a => a.id === agentId.value) ?? null
  )

  function openAIPanel()  { isAIPanelOpen.value = true }
  function closeAIPanel() { isAIPanelOpen.value = false }

  function clearAnalysis() {
    streamingThinking.value = ''; suggestions.value = []; analysisResult.value = null
    highlightedIds.value = new Set()
    if (import.meta.client) localStorage.removeItem(AI_CACHE_KEY)
  }

  function appendThinking(text: string) { streamingThinking.value += text }
  function addSuggestion(action: MindMapAction) { suggestions.value.push(action) }

  function setHighlighted(ids: string[]) { highlightedIds.value = new Set(ids) }
  function clearHighlights() { highlightedIds.value = new Set() }

  function setAgent(id: string) {
    agentId.value = id
    if (import.meta.client) localStorage.setItem(AGENT_KEY, id)
  }

  watch(analysisResult, (result) => {
    if (!import.meta.client) return
    if (result) localStorage.setItem(AI_CACHE_KEY, JSON.stringify(result))
    else localStorage.removeItem(AI_CACHE_KEY)
  })

  return {
    isAnalyzing:       skipHydrate(isAnalyzing),
    isAIPanelOpen:     skipHydrate(isAIPanelOpen),
    userPrompt:        skipHydrate(userPrompt),
    highlightedIds:    skipHydrate(highlightedIds),
    streamingThinking: skipHydrate(streamingThinking),
    suggestions:       skipHydrate(suggestions),
    analysisResult:    skipHydrate(analysisResult),
    agentId:           skipHydrate(agentId),
    activeAgent,
    openAIPanel, closeAIPanel, clearAnalysis, appendThinking, addSuggestion,
    setHighlighted, clearHighlights, setAgent,
  }
})
