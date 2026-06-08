<template>
  <g :class="{ 'node-layouting': isLayouting }"
     :transform="`translate(${node.x} ${node.y}) rotate(${decor.rot})`">

    <!-- AI highlight ring -->
    <g v-if="isHighlighted" filter="url(#wobble)">
      <path :d="decor.path0"
            fill="none"
            stroke="var(--accent)"
            stroke-width="3.5"
            stroke-dasharray="5 3"
            :transform="`scale(${1 + 10 / decor.w})`"
            opacity="0.7">
        <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.2s" repeatCount="indefinite"/>
      </path>
    </g>

    <!-- Selection halo -->
    <g v-if="isSelected || isLinkSource" filter="url(#wobble)">
      <path :d="decor.path0"
            fill="none"
            stroke="var(--accent)"
            stroke-width="3.2"
            :stroke-dasharray="isLinkSource ? '6 4' : '0'"
            :transform="`scale(${1 + 6 / decor.w})`"
            opacity="0.55"/>
    </g>

    <!-- Node body -->
    <g filter="url(#wobble)" class="node-rect"
       role="button"
       :aria-label="node.label"
       tabindex="0"
       @pointerdown="(e) => emit('pointerdown', e)"
       @dblclick="(e) => emit('dblclick', e)"
       @keydown.enter="() => emit('edit')"
       @keydown.delete="() => emit('delete')">
      <path :d="decor.path0"
            fill="var(--paper-card)"
            :stroke="isSelected ? 'var(--accent)' : '#1f2533'"
            :stroke-width="decor.level === 0 ? 2 : 1.6"
            stroke-linejoin="round"/>
      <path :d="decor.path1"
            fill="none"
            :stroke="isSelected ? 'var(--accent)' : '#1f2533'"
            :stroke-width="(decor.level === 0 ? 2 : 1.6) * 0.55"
            stroke-linejoin="round" opacity="0.55"/>
    </g>

    <!-- Label (hidden while editing) -->
    <text v-if="!isEditing"
          class="node-text"
          :class="{ selected: isSelected }"
          :font-size="decor.fontSize"
          :font-weight="decor.level === 0 ? 700 : 500">
      {{ node.label }}
    </text>

    <!-- Underline scribble for selected -->
    <g v-if="isSelected" filter="url(#wobble-soft)">
      <path :d="underlinePath(decor.w, decor.h)"
            stroke="var(--accent)" stroke-width="2" fill="none" stroke-linecap="round"/>
    </g>
  </g>
</template>

<script setup lang="ts">
import { underlinePath } from '~/lib/mindmap/geometry'
import type { MindMapNode } from '~/lib/ai/types'

export interface NodeDecor {
  w: number; h: number; fontSize: number; radius: number
  x: number; y: number
  path0: string; path1: string
  rot: number; level: number
}

defineProps<{
  node: MindMapNode
  decor: NodeDecor
  isSelected: boolean
  isLinkSource: boolean
  isHighlighted: boolean
  isEditing: boolean
  isLayouting: boolean
}>()

const emit = defineEmits<{
  pointerdown: [PointerEvent]
  dblclick: [MouseEvent]
  edit: []
  delete: []
}>()
</script>

<style scoped>
.node-layouting {
  transition: transform 0.55s cubic-bezier(0.34, 1.2, 0.64, 1);
}
</style>
