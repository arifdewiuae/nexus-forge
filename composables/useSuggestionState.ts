import { ref, watch } from 'vue'
import { applyAction } from '~/lib/mindmap/applier'
import type { MindMapAction } from '~/lib/ai/types'
import type { useGraphStore } from '~/stores/useGraphStore'
import type { useAIStore } from '~/stores/useAIStore'

type GraphStore = ReturnType<typeof useGraphStore>
type AIStore = ReturnType<typeof useAIStore>

/**
 * Tracks which suggestion cards have been applied or rejected.
 * Resets on each new analysis batch.
 */
export function useSuggestionState(graph: GraphStore, ai: AIStore) {
  const appliedSet  = ref(new Set<number>())
  const rejectedSet = ref(new Set<number>())

  watch(() => ai.suggestions.length, (n, prev) => {
    if (n > 0 && prev === 0) {
      appliedSet.value  = new Set()
      rejectedSet.value = new Set()
    }
  })

  function apply(action: MindMapAction, i: number) {
    applyAction(graph, ai, action)
    appliedSet.value = new Set(appliedSet.value).add(i)
  }

  function undo(i: number) {
    graph.undo()
    appliedSet.value = new Set([...appliedSet.value].filter(x => x !== i))
  }

  function reject(i: number) {
    rejectedSet.value = new Set(rejectedSet.value).add(i)
  }

  return { appliedSet, rejectedSet, apply, undo, reject }
}
