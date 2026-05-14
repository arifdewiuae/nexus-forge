import { defineStore } from 'pinia'
import type { BoardAction, PresenceUser, AnalysisResult } from '~/lib/ai/types'

export type CanvasTool = 'select' | 'draw' | 'rect' | 'ellipse' | 'sticky' | 'text' | 'arrow'

export const useBoardStore = defineStore('board', () => {
  const activeTool = ref<CanvasTool>('select')
  const isAnalyzing = ref(false)
  const isTracePanelOpen = ref(false)
  const streamingThinking = ref('')
  const suggestions = ref<BoardAction[]>([])
  const analysisResult = ref<AnalysisResult | null>(null)
  const presenceUsers = ref<PresenceUser[]>([])
  const hasUnsavedChanges = ref(false)
  const zoom = ref(1)

  function setTool(tool: CanvasTool) {
    activeTool.value = tool
  }

  function openTracePanel() {
    isTracePanelOpen.value = true
  }

  function closeTracePanel() {
    isTracePanelOpen.value = false
  }

  function clearAnalysis() {
    streamingThinking.value = ''
    suggestions.value = []
    analysisResult.value = null
  }

  function appendThinking(text: string) {
    streamingThinking.value += text
  }

  function addSuggestion(action: BoardAction) {
    suggestions.value.push(action)
  }

  function setZoom(z: number) {
    zoom.value = z
  }

  return {
    activeTool,
    isAnalyzing,
    isTracePanelOpen,
    streamingThinking,
    suggestions,
    analysisResult,
    presenceUsers,
    hasUnsavedChanges,
    zoom,
    setTool,
    openTracePanel,
    closeTracePanel,
    clearAnalysis,
    appendThinking,
    addSuggestion,
    setZoom,
  }
})
