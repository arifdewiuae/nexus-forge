<template>
  <div class="ai-suggestion-item" :class="{ 'is-applied': applied }">
    <div class="ai-suggestion-kind">{{ kindLabel(action.kind) }}</div>
    <div class="ai-suggestion-text">{{ description }}</div>
    <div class="ai-suggestion-actions">
      <template v-if="applied">
        <span class="ai-suggestion-done">✓ applied</span>
        <button class="ai-suggestion-undo" @click="emit('undo')" aria-label="Undo this suggestion" title="Undo this action">↶ undo</button>
      </template>
      <template v-else>
        <button class="ai-suggestion-reject" @click="emit('reject')" aria-label="Dismiss this suggestion" title="Dismiss">✕</button>
        <button class="ai-suggestion-btn" @click="emit('apply')">apply</button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MindMapAction } from '~/lib/ai/types'
import { kindLabel, describeAction } from '~/lib/ai/describeAction'

const props = defineProps<{
  action: MindMapAction
  applied: boolean
}>()

const emit = defineEmits<{
  apply: []
  undo: []
  reject: []
}>()

const graph = useGraphStore()

// Resolve node ids to labels (fall back to the id) for the description text.
const description = computed(() =>
  describeAction(props.action, (id) => graph.nodeById(id)?.label ?? id),
)
</script>

<style scoped>
/* Base .ai-suggestion-item/-kind/-text/-btn live in globals.css (shared);
   these are the action-row specifics that were AIPanel-scoped before extraction. */
.ai-suggestion-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.ai-suggestion-item.is-applied {
  opacity: 0.55;
}

.ai-suggestion-done {
  font-family: 'Kalam', cursive;
  font-size: 11px;
  color: var(--muted);
}

.ai-suggestion-undo {
  font-family: 'Caveat', cursive;
  font-size: 14px;
  background: transparent;
  border: 1.2px solid var(--muted);
  color: var(--muted);
  border-radius: 10px;
  padding: 1px 8px;
  cursor: pointer;
  white-space: nowrap;
}

.ai-suggestion-undo:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.ai-suggestion-reject {
  font-size: 11px;
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 2px 4px;
  opacity: 0.5;
  line-height: 1;
}

.ai-suggestion-reject:hover {
  color: #c0392b;
  opacity: 1;
}
</style>
