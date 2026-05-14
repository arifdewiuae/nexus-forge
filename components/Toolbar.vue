<script setup lang="ts">
import {
  MousePointer2, Pencil, Square, Circle,
  StickyNote, Type, Minus, Trash2, RotateCcw,
} from 'lucide-vue-next'
import type { CanvasTool } from '~/stores/boardStore'

defineProps<{
  onClear: () => void
  onResetZoom: () => void
}>()

const store = useBoardStore()

interface ToolDef {
  id: CanvasTool
  icon: ReturnType<typeof defineComponent>
  label: string
  shortcut: string
}

const tools: ToolDef[] = [
  { id: 'select',  icon: MousePointer2, label: 'Select',      shortcut: 'V' },
  { id: 'draw',    icon: Pencil,        label: 'Draw',         shortcut: 'P' },
  { id: 'rect',    icon: Square,        label: 'Rectangle',    shortcut: 'R' },
  { id: 'ellipse', icon: Circle,        label: 'Circle',       shortcut: 'E' },
  { id: 'sticky',  icon: StickyNote,    label: 'Sticky Note',  shortcut: 'S' },
  { id: 'text',    icon: Type,          label: 'Text',         shortcut: 'T' },
  { id: 'arrow',   icon: Minus,         label: 'Line',         shortcut: 'L' },
]
</script>

<template>
  <aside
    class="flex flex-col items-center gap-1 w-14 py-3 bg-slate-900 border-r border-slate-800 shrink-0 z-10"
    aria-label="Drawing tools"
  >
    <!-- Tool buttons -->
    <button
      v-for="tool in tools"
      :key="tool.id"
      :aria-label="`${tool.label} (${tool.shortcut})`"
      :title="`${tool.label} · ${tool.shortcut}`"
      :class="[
        'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
        store.activeTool === tool.id
          ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/50'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
      ]"
      @click="store.setTool(tool.id)"
    >
      <component :is="tool.icon" :size="18" />
    </button>

    <!-- Divider -->
    <div class="w-8 border-t border-slate-700 my-1" />

    <!-- Reset zoom -->
    <button
      aria-label="Reset zoom"
      title="Reset zoom"
      class="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
      @click="onResetZoom"
    >
      <RotateCcw :size="16" />
    </button>

    <!-- Clear board -->
    <button
      aria-label="Clear board"
      title="Clear board"
      class="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-900/50 hover:text-red-400 transition-colors"
      @click="onClear"
    >
      <Trash2 :size="16" />
    </button>

    <!-- Zoom indicator -->
    <div class="mt-auto mb-1 text-[10px] text-slate-500 font-mono tabular-nums">
      {{ Math.round(store.zoom * 100) }}%
    </div>
  </aside>
</template>
