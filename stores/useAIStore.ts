/* =========================================================
   stores/useAIStore.ts — AI streaming state, agents, highlights
   ========================================================= */
import { defineStore, skipHydrate } from 'pinia'
import type { MindMapAction, AnalysisResult, AgentPersona } from '~/lib/ai/types'
import { AGENTS } from '~/lib/ai/types'

const AI_CACHE_KEY = 'nf:ai:result'
const AGENT_KEY    = 'nf:agent:id'

function readStoredAgentId(): string {
  if (!import.meta.client) return ''
  try {
    const id = localStorage.getItem(AGENT_KEY) ?? ''
    return AGENTS.some(a => a.id === id) ? id : ''
  } catch { return '' }
}

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

  const agentId = ref('')
  const activeAgent = computed<AgentPersona | null>(
    () => AGENTS.find(a => a.id === agentId.value) ?? null
  )

  function hydrateAgentFromStorage() {
    agentId.value = readStoredAgentId()
  }

  watch(agentId, (id) => {
    if (!import.meta.client) return
    if (id) localStorage.setItem(AGENT_KEY, id)
    else localStorage.removeItem(AGENT_KEY)
  })

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
    if (!AGENTS.some(a => a.id === id)) return
    agentId.value = id
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
    setHighlighted, clearHighlights, setAgent, hydrateAgentFromStorage,
  }
})
