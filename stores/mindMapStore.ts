/**
 * mindMapStore — compatibility composite.
 *
 * Delegates to the three focused stores:
 *   useGraphStore    — graph nodes, cross-links, undo/redo, persistence
 *   useAIStore       — streaming AI state, suggestions, agent, highlights
 *   useSettingsStore — accent colour, theme
 *
 * Existing callers import `useMindMapStore` and get a unified object
 * that merges all three stores. New code should import the focused stores directly.
 */
import { defineStore } from 'pinia'
import { useGraphStore }    from './useGraphStore'
import { useAIStore }       from './useAIStore'
import { useSettingsStore } from './useSettingsStore'

export { useGraphStore, useAIStore, useSettingsStore }

export const useMindMapStore = defineStore('mindMap', () => {
  const graph    = useGraphStore()
  const ai       = useAIStore()
  const settings = useSettingsStore()

  return {
    /* ---- graph ---- */
    get title()      { return graph.title },
    set title(v)     { graph.title = v },
    get nextId()     { return graph.nextId },
    set nextId(v)    { graph.nextId = v },
    get nodes()      { return graph.nodes },
    get selectedId() { return graph.selectedId },
    set selectedId(v) { graph.selectedId = v },
    get linkFromId() { return graph.linkFromId },
    set linkFromId(v) { graph.linkFromId = v },
    get tool()       { return graph.tool },
    set tool(v)      { graph.tool = v },
    get editingId()  { return graph.editingId },
    set editingId(v) { graph.editingId = v },
    get saveStatus() { return graph.saveStatus },
    get canUndo()    { return graph.canUndo },
    get canRedo()    { return graph.canRedo },
    get isLayouting()  { return graph.isLayouting },
    set isLayouting(v) { graph.isLayouting = v },
    get crossLinks() { return graph.crossLinks },

    undo:           graph.undo.bind(graph),
    redo:           graph.redo.bind(graph),
    nodeById:       graph.nodeById.bind(graph),
    rootNode:       graph.rootNode.bind(graph),
    childrenOf:     graph.childrenOf.bind(graph),
    ancestorsOf:    graph.ancestorsOf.bind(graph),
    levelOf:        graph.levelOf.bind(graph),
    descendantsOf:  graph.descendantsOf.bind(graph),
    addNodeAt:      graph.addNodeAt.bind(graph),
    addChild:       graph.addChild.bind(graph),
    deleteSubtree:  graph.deleteSubtree.bind(graph),
    setLabel:       graph.setLabel.bind(graph),
    moveNode:       graph.moveNode.bind(graph),
    beginDrag:      graph.beginDrag.bind(graph),
    endDrag:        graph.endDrag.bind(graph),
    reparent:       graph.reparent.bind(graph),
    setTitle:       graph.setTitle.bind(graph),
    reset:          graph.reset.bind(graph),
    exportJSON:     graph.exportJSON.bind(graph),
    importJSON:     graph.importJSON.bind(graph),
    addCrossLink:   graph.addCrossLink.bind(graph),
    removeCrossLink: graph.removeCrossLink.bind(graph),
    crossLinksOf:   graph.crossLinksOf.bind(graph),
    applyLayout:    graph.applyLayout.bind(graph),

    /* ---- AI ---- */
    get isAnalyzing()       { return ai.isAnalyzing },
    set isAnalyzing(v)      { ai.isAnalyzing = v },
    get isAIPanelOpen()     { return ai.isAIPanelOpen },
    get userPrompt()        { return ai.userPrompt },
    set userPrompt(v)       { ai.userPrompt = v },
    get highlightedIds()    { return ai.highlightedIds },
    get streamingThinking() { return ai.streamingThinking },
    get suggestions()       { return ai.suggestions },
    get analysisResult()    { return ai.analysisResult },
    set analysisResult(v)   { ai.analysisResult = v },
    get agentId()           { return ai.agentId },
    get activeAgent()       { return ai.activeAgent },

    openAIPanel:     ai.openAIPanel.bind(ai),
    closeAIPanel:    ai.closeAIPanel.bind(ai),
    clearAnalysis:   ai.clearAnalysis.bind(ai),
    appendThinking:  ai.appendThinking.bind(ai),
    addSuggestion:   ai.addSuggestion.bind(ai),
    setHighlighted:  ai.setHighlighted.bind(ai),
    clearHighlights: ai.clearHighlights.bind(ai),
    setAgent:        ai.setAgent.bind(ai),

    /* ---- settings ---- */
    get accentColor() { return settings.accentColor },
    setAccent: settings.setAccent.bind(settings),
  }
})
