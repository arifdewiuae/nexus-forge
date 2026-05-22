<template>
  <div class="toolbar">
    <div class="toolbar-scroll">
      <!-- Canvas tools -->
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

      <span class="tool-divider toolbar-divider"></span>

      <!-- History -->
      <button class="tool-chip" :disabled="!G.canUndo" @click="G.undo()" title="Undo (⌘Z)" aria-label="Undo">
        <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
        <span class="chip-label">↶ undo</span>
        <span class="chip-icon" aria-hidden="true">↶</span>
      </button>
      <button class="tool-chip" :disabled="!G.canRedo" @click="G.redo()" title="Redo (⌘⇧Z)" aria-label="Redo">
        <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
        <span class="chip-label">↷ redo</span>
        <span class="chip-icon" aria-hidden="true">↷</span>
      </button>

      <span class="tool-divider toolbar-divider"></span>

      <!-- AI actions -->
      <button ref="aiBtn" class="tool-chip tool-chip--ai" :class="{ active: G.isAIPanelOpen }"
              :disabled="G.isAnalyzing"
              @click="emit('analyze')"
              title="Ask AI to analyze your mind map (⌘↵)"
              :aria-label="G.isAnalyzing ? 'AI thinking…' : 'Ask AI to analyze map'">
        <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
        <span class="chip-label chip-label--full">{{ G.isAnalyzing ? '⟳ thinking…' : '✦ ask AI' }}</span>
        <span class="chip-label chip-label--short">{{ G.isAnalyzing ? '⟳' : '✦ AI' }}</span>
        <span class="chip-icon" aria-hidden="true">{{ G.isAnalyzing ? '⟳' : '✦' }}</span>
      </button>

      <button class="tool-chip" :class="{ 'chip-thinking': G.isLayouting }" :disabled="G.isLayouting" @click="emit('tidy')" title="Tidy layout" aria-label="Tidy radial layout">
        <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
        <span class="chip-label">
          <span v-if="G.isLayouting"><span class="spin-icon">⟳</span> tidying…</span>
          <span v-else>⊹ tidy</span>
        </span>
        <span class="chip-icon" aria-hidden="true">{{ G.isLayouting ? '⟳' : '⊹' }}</span>
      </button>
    </div>

    <!-- Pinned — never scrolls off screen -->
    <div class="toolbar-more">
      <button ref="moreBtn" class="tool-chip overflow-btn"
              :class="{ active: overflowOpen }"
              aria-haspopup="menu"
              :aria-expanded="overflowOpen"
              aria-label="More options"
              title="More options"
              @click="toggleOverflow">
        <svg class="chip-blob" preserveAspectRatio="none" viewBox="0 0 120 34"><path :d="TOOL_BLOB" filter="url(#wobble)"/></svg>
        <span class="chip-label">⋯ more</span>
        <span class="chip-icon" aria-hidden="true">⋯</span>
      </button>
    </div>

    <Teleport to="body">
      <div v-if="overflowOpen" class="overflow-backdrop" aria-hidden="true" @click="overflowOpen = false"></div>
      <div v-if="overflowOpen"
           class="overflow-popover"
           role="menu"
           aria-label="More options"
           :style="popoverStyle">
        <div class="overflow-grid">
          <button class="overflow-item" role="menuitem" @click="pick('fit')">⊡ fit</button>
          <button class="overflow-item" role="menuitem" @click="pick('export')">⇪ export</button>
          <button class="overflow-item" role="menuitem" @click="pick('import')">⇩ import</button>
          <button class="overflow-item" role="menuitem" @click="pick('agent')">{{ G.activeAgent ? G.activeAgent.name : '⬡ agent' }}</button>
          <button class="overflow-item" role="menuitem" @click="pick('help')">? help</button>
          <button class="overflow-item" :class="{ 'key-warn': !hasKey }" role="menuitem" @click="pick('settings')">⚙ settings{{ hasKey ? '' : ' !' }}</button>
          <button class="overflow-item danger" role="menuitem" @click="pick('reset')">↻ reset</button>
        </div>
        <div class="overflow-accent">
          <span>accent</span>
          <input type="color" class="overflow-color" :value="G.accentColor"
                 @input="(e) => G.setAccent((e.target as HTMLInputElement).value)"
                 title="Change accent color"/>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
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
const moreBtn = ref<HTMLButtonElement | null>(null)
const overflowOpen = ref(false)
const popoverStyle = ref<{ top: string; left: string }>({ top: '0', left: '0' })
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

function toggleOverflow() {
  if (!overflowOpen.value && moreBtn.value) {
    const r = moreBtn.value.getBoundingClientRect()
    const width = 280
    const left = Math.max(12, Math.min(r.right - width, window.innerWidth - width - 12))
    popoverStyle.value = { top: `${r.bottom + 8}px`, left: `${left}px` }
  }
  overflowOpen.value = !overflowOpen.value
}

type OverflowAction = 'fit' | 'export' | 'import' | 'agent' | 'help' | 'settings' | 'reset'

function pick(action: OverflowAction) {
  overflowOpen.value = false
  emit(action)
}

function onDocKey(e: KeyboardEvent) {
  if (e.key === 'Escape') overflowOpen.value = false
}

onMounted(() => document.addEventListener('keydown', onDocKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onDocKey))
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 0;
  overflow: hidden;
}

.toolbar-scroll {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  padding-right: 4px;
  mask-image: linear-gradient(to right, black calc(100% - 20px), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black calc(100% - 20px), transparent 100%);
}

.toolbar-scroll::-webkit-scrollbar { display: none; }

.toolbar-more {
  flex-shrink: 0;
  position: relative;
  padding-left: 4px;
  background: linear-gradient(90deg, transparent, var(--paper) 18px);
}

.chip-icon { display: none; }
.chip-label--short { display: none; }

/* Tablet / narrow laptop: icon-only chips to save width */
@media (max-width: 1100px) {
  .toolbar-scroll .chip-label:not(.chip-label--short) { display: none; }
  .toolbar-scroll .chip-icon { display: inline; position: relative; z-index: 1; }
  .toolbar-divider { display: none; }
  .tool-chip--ai .chip-label--full { display: none; }
  .tool-chip--ai .chip-label--short { display: inline; position: relative; z-index: 1; }
}

/* Keep "more" label visible until phone width */
@media (max-width: 1100px) {
  .overflow-btn .chip-label { display: inline; position: relative; z-index: 1; }
  .overflow-btn .chip-icon { display: none; }
}

@media (max-width: 520px) {
  .overflow-btn .chip-label { display: none; }
  .overflow-btn .chip-icon { display: inline; position: relative; z-index: 1; }
}

@media (max-width: 800px) {
  .toolbar-more {
    background: var(--paper-card);
  }
}

.overflow-popover {
  position: fixed;
  background: var(--paper-card);
  border: 1.5px solid var(--ink);
  border-radius: 16px;
  padding: 14px;
  z-index: 100;
  box-shadow: 0 8px 28px rgba(0,0,0,0.18);
  min-width: 280px;
  max-width: min(320px, calc(100vw - 24px));
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
  z-index: 99;
}
</style>
