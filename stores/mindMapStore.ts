/**
 * mindMapStore — compatibility composite.
 *
 * All reactive state is exposed via storeToRefs so that Pinia's reactive
 * proxy correctly tracks changes from the three focused stores.
 *
 * New code should import the focused stores directly:
 *   useGraphStore    — graph nodes, cross-links, undo/redo, persistence
 *   useAIStore       — streaming AI state, suggestions, agent, highlights
 *   useSettingsStore — accent colour, theme
 */
import { defineStore, storeToRefs } from 'pinia'
import { useGraphStore }    from './useGraphStore'
import { useAIStore }       from './useAIStore'
import { useSettingsStore } from './useSettingsStore'

export const useMindMapStore = defineStore('mindMap', () => {
  const graph    = useGraphStore()
  const ai       = useAIStore()
  const settings = useSettingsStore()

  // Reactive refs — these update properly in templates
  const {
    title, nextId, nodes, crossLinks,
    selectedId, linkFromId, tool, editingId,
    saveStatus, canUndo, canRedo, isLayouting,
  } = storeToRefs(graph)

  const {
    isAnalyzing, isAIPanelOpen, userPrompt, highlightedIds,
    streamingThinking, suggestions, analysisResult,
    agentId, activeAgent,
  } = storeToRefs(ai)

  const { accentColor } = storeToRefs(settings)

  return {
    /* ---- graph state ---- */
    title, nextId, nodes, crossLinks,
    selectedId, linkFromId, tool, editingId,
    saveStatus, canUndo, canRedo, isLayouting,

    /* ---- graph actions ---- */
    undo:           graph.undo,
    redo:           graph.redo,
    nodeById:       graph.nodeById,
    rootNode:       graph.rootNode,
    childrenOf:     graph.childrenOf,
    ancestorsOf:    graph.ancestorsOf,
    levelOf:        graph.levelOf,
    descendantsOf:  graph.descendantsOf,
    addNodeAt:      graph.addNodeAt,
    addChild:       graph.addChild,
    deleteSubtree:  graph.deleteSubtree,
    setLabel:       graph.setLabel,
    moveNode:       graph.moveNode,
    beginDrag:      graph.beginDrag,
    endDrag:        graph.endDrag,
    reparent:       graph.reparent,
    setTitle:       graph.setTitle,
    reset:          graph.reset,
    exportJSON:     graph.exportJSON,
    importJSON:     graph.importJSON,
    addCrossLink:   graph.addCrossLink,
    removeCrossLink: graph.removeCrossLink,
    crossLinksOf:   graph.crossLinksOf,
    applyLayout:    graph.applyLayout,
    pushHistory:    graph.pushHistory,

    /* ---- AI state ---- */
    isAnalyzing, isAIPanelOpen, userPrompt, highlightedIds,
    streamingThinking, suggestions, analysisResult,
    agentId, activeAgent,

    /* ---- AI actions ---- */
    openAIPanel:     ai.openAIPanel,
    closeAIPanel:    ai.closeAIPanel,
    clearAnalysis:   ai.clearAnalysis,
    appendThinking:  ai.appendThinking,
    addSuggestion:   ai.addSuggestion,
    setHighlighted:  ai.setHighlighted,
    clearHighlights: ai.clearHighlights,
    setAgent:        ai.setAgent,

    /* ---- settings ---- */
    accentColor,
    setAccent: settings.setAccent,
  }
})
