<script setup lang="ts">
import { computeRadialLayout } from '~/lib/mindmap/layout'
import { AI_PANEL } from '~/lib/config'

definePageMeta({ ssr: false })

const canvasRef = ref<{ zoomIn(): void; zoomOut(): void; fitView(): void; centerOn(id: string): void; startEdit(node: { id: string; label: string; x: number; y: number; parent: string | null }): void; exportPNG(): Promise<void>; zoomPct: number } | null>(null)
const toolbarRef = ref<{ aiBtn: HTMLButtonElement | null } | null>(null)

const graph = useGraphStore()
const ai = useAIStore()
const settings = useSettingsStore()

const modal = ref<{ open: boolean; mode: 'export' | 'import' | 'help' | 'confirm' | 'settings' | null }>({ open: false, mode: null })
function openModal(mode: 'export' | 'import' | 'help' | 'confirm' | 'settings') { modal.value = { open: true, mode } }
function closeModal() { modal.value = { open: false, mode: null } }

function handleConfirmedReset() {
  graph.reset()
  ai.clearAnalysis()
}

const showAgentSelector = ref(false)

/* ---- Panel anchor position (near Ask AI button) ---- */
const panelAnchor = ref<{ x: number; y: number }>({ x: AI_PANEL.DEFAULT_ANCHOR_X, y: AI_PANEL.DEFAULT_ANCHOR_Y })

function computePanelAnchor() {
  const btn = toolbarRef.value?.aiBtn
  if (!btn) return
  const r = btn.getBoundingClientRect()

  panelAnchor.value = {
    x: Math.max(AI_PANEL.ANCHOR_MIN_X, r.left),
    y: r.bottom + AI_PANEL.ANCHOR_GAP_Y,
  }
}

/* ---- Theme init: apply stored accent color on mount ---- */
onMounted(() => {
  document.documentElement.style.setProperty('--accent', settings.accentColor)
  ai.hydrateAgentFromStorage()

  if (!ai.agentId) showAgentSelector.value = true
})

/* ---- Keyboard shortcuts ---- */
useKeyboardShortcuts({
  analyze:           handleAnalyze,
  closeAIPanel:      handleCloseAIPanel,
  closeModal,
  isModalOpen:       () => modal.value.open,
  agentSelectorOpen: showAgentSelector,
  startEdit:         (node) => canvasRef.value?.startEdit(node),
  fitView:           () => canvasRef.value?.fitView(),
})

/* ---- AI analysis ---- */
const { analyze, abort } = useAIAnalysis(() => openModal('settings'))

async function handleAnalyze() {
  if (!ai.activeAgent) { showAgentSelector.value = true; return }
  computePanelAnchor()
  ai.openAIPanel()
}

async function handleForceAnalyze() {
  ai.clearAnalysis()
  await analyze()
}

function handleCloseAIPanel() {
  abort()
  ai.closeAIPanel()
}

/* ---- Tidy layout ---- */
async function handleTidy() {
  if (graph.isLayouting) return
  graph.isLayouting = true
  await nextTick()
  const positions = computeRadialLayout(graph.nodes)
  graph.applyLayout(positions)
  await nextTick()
  canvasRef.value?.fitView()
  graph.isLayouting = false
}

/* ---- Theme ---- */
function onAccentChange(color: string) {
  settings.setAccent(color)
}
</script>

<template>
  <div id="app">
    <ClientOnly>
      <PaperBackground/>
      <MindMapCanvas
        ref="canvasRef"
        @center-on="(id) => canvasRef?.centerOn(id)"
      />
      <MindMapHeader/>
      <MindMapToolbar
        ref="toolbarRef"
        @fit="canvasRef?.fitView()"
        @export="openModal('export')"
        @import="openModal('import')"
        @help="openModal('help')"
        @analyze="handleAnalyze"
        @agent="showAgentSelector = true"
        @tidy="handleTidy"
        @reset="openModal('confirm')"
        @settings="openModal('settings')"
      />
      <MindMapSideNote
        @center-on="(id) => canvasRef?.centerOn(id)"
        @start-edit="(id) => { const n = graph.nodeById(id); if(n) canvasRef?.startEdit(n) }"
      />

      <!-- Zoom readout -->
      <div class="zoom-readout">
        <button class="zoom-btn" @click="canvasRef?.zoomOut()" title="Zoom out">−</button>
        <span class="zoom-pct">{{ canvasRef?.zoomPct ?? 100 }}%</span>
        <button class="zoom-btn" @click="canvasRef?.zoomIn()" title="Zoom in">+</button>
        <button class="zoom-btn" style="width:auto;padding:0 8px;font-size:18px" @click="canvasRef?.fitView()" title="Fit (F)">fit</button>
      </div>

      <!-- Keyboard hint (hidden on touch devices via CSS) -->
      <div class="hint">
        <span><kbd>tab</kbd> add child</span>
        <span><kbd>enter</kbd> rename</span>
        <span><kbd>del</kbd> delete</span>
        <span><kbd>L</kbd> branch · <kbd>C</kbd> connect</span>
        <span><kbd>⌘Z</kbd> undo</span>
        <span><kbd>⌘↵</kbd> ask AI</span>
        <span><kbd>scroll</kbd> pan · <kbd>⌘</kbd>+<kbd>scroll</kbd> zoom</span>
      </div>

      <!-- AI analysis panel -->
      <AIPanel
        v-if="ai.isAIPanelOpen"
        :initialX="panelAnchor.x"
        :initialY="panelAnchor.y"
        @close="handleCloseAIPanel"
        @analyze="handleForceAnalyze"
      />

      <!-- Agent selector overlay -->
      <AgentSelector
        v-if="showAgentSelector"
        @close="showAgentSelector = false"
        @select="showAgentSelector = false"
      />

      <!-- Theme color + legend row -->
      <div class="theme-picker-row">
        <span class="legend-item"><svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#1f2533" stroke-width="1.5" stroke-linecap="round" opacity="0.62"/></svg> branch</span>
        <span class="legend-item"><svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#1f2533" stroke-width="1.4" stroke-dasharray="5 4" stroke-linecap="round" opacity="0.5"/></svg> connect</span>
        <button class="legend-info-btn" @click="openModal('help')" title="How do these work?">?</button>
        <span class="legend-sep">·</span>
        <span class="theme-picker-label">accent</span>
        <input type="color" class="theme-color-input" :value="settings.accentColor" @input="(e) => onAccentChange((e.target as HTMLInputElement).value)" title="Change accent color"/>
      </div>

      <!-- Modal -->
      <MindMapModal
        :open="modal.open"
        :mode="modal.mode"
        @close="closeModal"
        @fit="canvasRef?.fitView()"
        @confirm="handleConfirmedReset"
        @exportpng="canvasRef?.exportPNG()"
      />
    </ClientOnly>
  </div>
</template>

<style scoped>
#app {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.theme-picker-row {
  position: absolute;
  bottom: 44px;
  left: 110px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 6;
}
.legend-info-btn {
  font-family: 'Caveat', cursive;
  font-size: 15px;
  color: var(--muted);
  background: none;
  border: 1px solid var(--muted);
  border-radius: 50%;
  width: 18px;
  height: 18px;
  padding: 0;
  line-height: 1;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.15s;
}
.legend-info-btn:hover { opacity: 1; }

.theme-picker-label {
  font-family: 'Caveat', cursive;
  font-size: 18px;
  color: var(--muted);
}
.theme-color-input {
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
.theme-color-input::-webkit-color-swatch-wrapper { padding: 0; }
.theme-color-input::-webkit-color-swatch { border: none; border-radius: 50%; }

@media (max-width: 800px) {
  .theme-picker-row { display: none; }
}
</style>
