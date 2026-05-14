<script setup lang="ts">
import { Check, ArrowRight, Tag, Palette, Link2, Layers } from 'lucide-vue-next'
import type { BoardAction } from '~/lib/ai/types'

const props = defineProps<{
  action: BoardAction
  onApply: (action: BoardAction) => void
}>()

const iconMap = {
  move: ArrowRight,
  group: Layers,
  label: Tag,
  recolor: Palette,
  connect: Link2,
} satisfies Record<BoardAction['kind'], unknown>

const labelMap: Record<BoardAction['kind'], string> = {
  move: 'Move',
  group: 'Group',
  label: 'Label',
  recolor: 'Recolor',
  connect: 'Connect',
}

const applied = ref(false)

function handleApply(): void {
  props.onApply(props.action)
  applied.value = true
}

function describeAction(action: BoardAction): string {
  if (action.kind === 'group') return action.label
  if (action.kind === 'label') return action.text
  if (action.kind === 'connect') return `${action.fromId} → ${action.toId}`
  return action.objectId
}
</script>

<template>
  <div class="flex items-start gap-2 p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors">
    <div class="mt-0.5 w-6 h-6 rounded bg-slate-700 flex items-center justify-center shrink-0">
      <component :is="iconMap[action.kind]" :size="12" class="text-violet-400" />
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-xs font-medium text-slate-300">{{ labelMap[action.kind] }}</p>
      <p class="text-xs text-slate-500 truncate mt-0.5">
        <template v-if="action.kind === 'group'">{{ action.label }}</template>
        <template v-else>{{ describeAction(action) }}</template>
      </p>
    </div>
    <button
      :aria-label="`Apply ${labelMap[action.kind]} suggestion`"
      :disabled="applied"
      :class="[
        'shrink-0 w-6 h-6 rounded flex items-center justify-center transition-colors text-xs',
        applied
          ? 'bg-green-900/40 text-green-400 cursor-default'
          : 'bg-violet-700/50 hover:bg-violet-600 text-violet-300 hover:text-white',
      ]"
      @click="handleApply"
    >
      <Check :size="11" />
    </button>
  </div>
</template>
