import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { applyAction } from '~/lib/mindmap/applier'
import type { MindMapAction } from '~/lib/ai/types'
import type { ReturnType as StoreType } from '~/stores/mindMapStore'

/**
 * Tracks which suggestion cards have been applied or rejected.
 * Resets on each new analysis batch.
 */
export function useSuggestionState(store: ReturnType<typeof import('~/stores/mindMapStore').useMindMapStore>) {
  const appliedSet  = ref(new Set<number>())
  const rejectedSet = ref(new Set<number>())

  watch(() => store.suggestions.length, (n, prev) => {
    if (n > 0 && prev === 0) {
      appliedSet.value  = new Set()
      rejectedSet.value = new Set()
    }
  })

  function apply(action: MindMapAction, i: number) {
    applyAction(store, action)
    appliedSet.value = new Set(appliedSet.value).add(i)
  }

  function undo(i: number) {
    store.undo()
    appliedSet.value = new Set([...appliedSet.value].filter(x => x !== i))
  }

  function reject(i: number) {
    rejectedSet.value = new Set(rejectedSet.value).add(i)
  }

  return { appliedSet, rejectedSet, apply, undo, reject }
}
