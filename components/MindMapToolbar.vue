<template>
  <div class="toolbar">
    <button v-for="t in tools" :key="t.id" class="tool-chip"
            :class="{ active: G.tool === t.id }"
            :title="`${t.label} (${t.key})`"
            @click="setTool(t.id)">
      <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34">
        <path :d="TOOL_BLOB" filter="url(#wobble)"/>
      </svg>
      <span>{{ t.label }}</span>
    </button>

    <span class="tool-divider"></span>

    <button class="tool-chip" :disabled="!G.canUndo" @click="G.undo()" title="Undo (⌘Z)">
      <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
      <span>↶ undo</span>
    </button>
    <button class="tool-chip" :disabled="!G.canRedo" @click="G.redo()" title="Redo (⌘⇧Z)">
      <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
      <span>↷ redo</span>
    </button>

    <span class="tool-divider"></span>

    <button class="tool-chip" @click="emit('fit')" title="Fit view (F)">
      <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
      <span>⊡ fit</span>
    </button>
    <button class="tool-chip" @click="emit('export')" title="Export JSON">
      <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
      <span>⇪ export</span>
    </button>
    <button class="tool-chip" @click="emit('import')" title="Import JSON">
      <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
      <span>⇩ import</span>
    </button>

    <span class="tool-divider"></span>

    <!-- AI button -->
    <button ref="aiBtn" class="tool-chip" :class="{ active: G.isAIPanelOpen }"
            :disabled="G.isAnalyzing"
            @click="emit('analyze')"
            title="Ask AI to analyze your mind map (⌘↵)">
      <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
      <span>{{ G.isAnalyzing ? '⟳ thinking…' : '✦ ask AI' }}</span>
    </button>

    <!-- Tidy layout -->
    <button class="tool-chip" :class="{ 'chip-thinking': G.isLayouting }" :disabled="G.isLayouting" @click="emit('tidy')" title="AI tidy layout">
      <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
      <span v-if="G.isLayouting"><span class="spin-icon">⟳</span> tidying…</span>
      <span v-else>⊹ tidy</span>
    </button>

    <!-- Agent selector -->
    <button class="tool-chip" @click="emit('agent')" title="Choose AI personality">
      <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
      <span>{{ G.activeAgent ? G.activeAgent.name : '⬡ agent' }}</span>
    </button>

    <span class="tool-divider"></span>

    <button class="tool-chip" @click="emit('help')" title="Help">
      <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
      <span>? help</span>
    </button>
    <button class="tool-chip danger" @click="doReset" title="Reset board">
      <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
      <span>↻ reset</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMindMapStore } from '~/stores/mindMapStore'

const G = useMindMapStore()

const emit = defineEmits<{
  fit: []
  export: []
  import: []
  help: []
  analyze: []
  agent: []
  tidy: []
  reset: []
}>()

const aiBtn = ref<HTMLButtonElement | null>(null)
defineExpose({ aiBtn })

const TOOL_BLOB = 'M 8 4 Q 60 1, 112 5 Q 116 17, 110 30 Q 60 33, 6 28 Q 3 14, 8 4 Z'

const tools = [
  { id: 'select'  as const, label: 'select',    key: 'V' },
  { id: 'add'     as const, label: '+ node',    key: 'A' },
  { id: 'branch'  as const, label: '↗ branch',  key: 'L' },
  { id: 'connect' as const, label: '⤳ connect', key: 'C' },
  { id: 'erase'   as const, label: '✗ erase',   key: 'E' },
]

function setTool(id: 'select' | 'add' | 'branch' | 'connect' | 'erase') {
  G.tool = id; G.linkFromId = null
}

function doReset() {
  emit('reset')
}
</script>
