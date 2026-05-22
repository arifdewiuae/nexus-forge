<template>
  <div class="toolbar">
    <!-- Primary tool chips — always visible -->
    <button v-for="t in tools" :key="t.id" class="tool-chip"
            :class="{ active: G.tool === t.id }"
            :title="`${t.label} (${t.key})`"
            :aria-label="`${t.label} tool (${t.key})`"
            @click="setTool(t.id)">
      <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34">
        <path :d="TOOL_BLOB" filter="url(#wobble)"/>
      </svg>
      <span class="chip-label">{{ t.label }}</span>
      <span class="chip-icon" aria-hidden="true">{{ t.icon }}</span>
    </button>

    <span class="tool-divider"></span>

    <!-- Ask AI — always visible -->
    <button ref="aiBtn" class="tool-chip" :class="{ active: G.isAIPanelOpen }"
            :disabled="G.isAnalyzing"
            @click="emit('analyze')"
            title="Ask AI to analyze your mind map (⌘↵)"
            :aria-label="G.isAnalyzing ? 'AI thinking…' : 'Ask AI to analyze map'">
      <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
      <span class="chip-label">{{ G.isAnalyzing ? '⟳ thinking…' : '✦ ask AI' }}</span>
      <span class="chip-icon" aria-hidden="true">{{ G.isAnalyzing ? '⟳' : '✦' }}</span>
    </button>

    <!-- Desktop-only chips -->
    <template class="desktop-chips">
      <span class="tool-divider desktop-only"></span>

      <button class="tool-chip desktop-only" :disabled="!G.canUndo" @click="G.undo()" title="Undo (⌘Z)" aria-label="Undo">
        <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
        <span>↶ undo</span>
      </button>
      <button class="tool-chip desktop-only" :disabled="!G.canRedo" @click="G.redo()" title="Redo (⌘⇧Z)" aria-label="Redo">
        <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
        <span>↷ redo</span>
      </button>

      <span class="tool-divider desktop-only"></span>

      <button class="tool-chip desktop-only" @click="emit('fit')" title="Fit view (F)" aria-label="Fit view">
        <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
        <span>⊡ fit</span>
      </button>
      <button class="tool-chip desktop-only" @click="emit('export')" title="Export JSON" aria-label="Export">
        <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
        <span>⇪ export</span>
      </button>
      <button class="tool-chip desktop-only" @click="emit('import')" title="Import JSON" aria-label="Import">
        <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
        <span>⇩ import</span>
      </button>

      <span class="tool-divider desktop-only"></span>

      <button class="tool-chip desktop-only" :class="{ 'chip-thinking': G.isLayouting }" :disabled="G.isLayouting" @click="emit('tidy')" title="Tidy layout" aria-label="Tidy radial layout">
        <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
        <span v-if="G.isLayouting"><span class="spin-icon">⟳</span> tidying…</span>
        <span v-else>⊹ tidy</span>
      </button>

      <button class="tool-chip desktop-only" @click="emit('agent')" title="Choose AI personality" :aria-label="G.activeAgent ? `AI agent: ${G.activeAgent.name}` : 'Choose AI agent'">
        <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
        <span>{{ G.activeAgent ? G.activeAgent.name : '⬡ agent' }}</span>
      </button>

      <span class="tool-divider desktop-only"></span>

      <button class="tool-chip desktop-only" @click="emit('help')" title="Help" aria-label="Help">
        <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
        <span>? help</span>
      </button>
      <button class="tool-chip desktop-only" :class="{ 'key-warn': !hasKey }" @click="emit('settings')" title="API key settings" :aria-label="hasKey ? 'API key settings' : 'API key required'">
        <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
        <span>⚙ keys{{ hasKey ? '' : ' !' }}</span>
      </button>
      <button class="tool-chip danger desktop-only" @click="doReset" title="Reset board" aria-label="Reset board">
        <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
        <span>↻ reset</span>
      </button>
    </template>

    <!-- ⋯ overflow button — mobile only -->
    <button class="tool-chip mobile-only overflow-btn"
            :class="{ active: overflowOpen }"
            @click="overflowOpen = !overflowOpen"
            aria-label="More options"
            title="More options">
      <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
      <span>⋯</span>
    </button>

    <!-- Overflow popover — mobile only -->
    <div v-if="overflowOpen" class="overflow-popover mobile-only" role="dialog" aria-label="More options">
      <div class="overflow-grid">
        <button class="overflow-item" :disabled="!G.canUndo" @click="G.undo(); overflowOpen=false">↶ undo</button>
        <button class="overflow-item" :disabled="!G.canRedo" @click="G.redo(); overflowOpen=false">↷ redo</button>
        <button class="overflow-item" @click="emit('fit'); overflowOpen=false">⊡ fit</button>
        <button class="overflow-item" :disabled="G.isLayouting" @click="emit('tidy'); overflowOpen=false">⊹ tidy</button>
        <button class="overflow-item" @click="emit('agent'); overflowOpen=false">{{ G.activeAgent ? G.activeAgent.name : '⬡ agent' }}</button>
        <button class="overflow-item" @click="emit('export'); overflowOpen=false">⇪ export</button>
        <button class="overflow-item" @click="emit('import'); overflowOpen=false">⇩ import</button>
        <button class="overflow-item" @click="emit('help'); overflowOpen=false">? help</button>
        <button class="overflow-item" :class="{ 'key-warn': !hasKey }" @click="emit('settings'); overflowOpen=false">⚙ keys{{ hasKey ? '' : ' !' }}</button>
        <button class="overflow-item danger" @click="doReset">↻ reset</button>
      </div>
      <!-- Accent colour picker inside overflow on mobile -->
      <div class="overflow-accent">
        <span>accent</span>
        <input type="color" class="overflow-color" :value="G.accentColor"
               @input="(e) => G.setAccent((e.target as HTMLInputElement).value)"
               title="Change accent color"/>
      </div>
    </div>

    <!-- Tap-outside to close overlay -->
    <div v-if="overflowOpen" class="overflow-backdrop mobile-only" @click="overflowOpen=false" aria-hidden="true"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMindMapStore } from '~/stores/mindMapStore'
import { useApiKeys } from '~/composables/useApiKeys'

const G = useMindMapStore()
const { hasKey } = useApiKeys()

const emit = defineEmits<{
  fit: []
  export: []
  import: []
  help: []
  analyze: []
  agent: []
  tidy: []
  reset: []
  settings: []
}>()

const aiBtn = ref<HTMLButtonElement | null>(null)
const overflowOpen = ref(false)
defineExpose({ aiBtn })

const TOOL_BLOB = 'M 8 4 Q 60 1, 112 5 Q 116 17, 110 30 Q 60 33, 6 28 Q 3 14, 8 4 Z'

const tools = [
  { id: 'select'  as const, label: 'select',  icon: '↖',  key: 'V' },
  { id: 'add'     as const, label: '+ node',  icon: '+',   key: 'A' },
  { id: 'branch'  as const, label: '↗ branch', icon: '↗', key: 'L' },
  { id: 'connect' as const, label: '⤳ connect', icon: '⤳', key: 'C' },
  { id: 'erase'   as const, label: '✗ erase', icon: '✗',  key: 'E' },
]

function setTool(id: 'select' | 'add' | 'branch' | 'connect' | 'erase') {
  G.tool = id; G.linkFromId = null
}

function doReset() {
  overflowOpen.value = false
  emit('reset')
}
</script>

<style scoped>
/* Hide chip text label on narrow touch screens — show icon instead */
.chip-icon { display: none; }

@media (max-width: 480px) {
  .chip-label { display: none; }
  .chip-icon { display: inline; position: relative; z-index: 1; }
}

/* Desktop-only elements hidden on mobile */
.desktop-only { display: none; }

/* Mobile-only elements hidden on desktop */
.mobile-only { display: none; }

@media (min-width: 801px) {
  .desktop-only { display: revert; }
}

@media (max-width: 800px) {
  .mobile-only { display: revert; }
}

/* Toolbar positioning on mobile */
@media (max-width: 800px) {
  /* Toolbar handled by globals.css — override left/top for mobile */
}

/* ---- Overflow popover ---- */
.overflow-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: var(--paper-card);
  border: 1.5px solid var(--ink);
  border-radius: 16px;
  padding: 14px;
  z-index: 30;
  box-shadow: 0 8px 28px rgba(0,0,0,0.18);
  min-width: 280px;
  max-width: calc(100vw - 24px);
}
.overflow-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.overflow-item {
  font-family: 'Caveat', cursive;
  font-size: 20px;
  color: var(--ink);
  background: transparent;
  border: 1.3px solid rgba(31,37,51,0.2);
  border-radius: 10px;
  padding: 8px 6px;
  cursor: pointer;
  text-align: center;
  min-height: 44px;
  line-height: 1.2;
  transition: background 0.12s, border-color 0.12s;
}
.overflow-item:hover:not(:disabled) {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}
.overflow-item:disabled { opacity: 0.32; cursor: default; }
.overflow-item.danger { color: var(--accent); border-color: var(--accent); }
.overflow-item.key-warn { color: #b85c00; border-color: #b85c00; }

.overflow-accent {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(31,37,51,0.12);
  font-family: 'Caveat', cursive;
  font-size: 18px;
  color: var(--muted);
}
.overflow-color {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1.5px solid var(--ink);
  border-radius: 50%;
  cursor: pointer;
  background: none;
  appearance: none;
  -webkit-appearance: none;
  overflow: hidden;
}
.overflow-color::-webkit-color-swatch-wrapper { padding: 0; }
.overflow-color::-webkit-color-swatch { border: none; border-radius: 50%; }

.overflow-backdrop {
  position: fixed;
  inset: 0;
  z-index: 29;
}

/* Mobile toolbar appearance handled in globals.css */
</style>
