<script setup lang="ts">
definePageMeta({ ssr: false })

const canvasRef = ref<{ zoomIn(): void; zoomOut(): void; fitView(): void; centerOn(id: string): void; startEdit(node: { id: string; label: string; x: number; y: number; parent: string | null }): void; zoomPct: number } | null>(null)
const toolbarRef = ref<{ aiBtn: HTMLButtonElement | null } | null>(null)

const G = useMindMapStore()

const modal = ref<{ open: boolean; mode: 'export' | 'import' | 'help' | 'confirm' | null }>({ open: false, mode: null })
function openModal(mode: 'export' | 'import' | 'help' | 'confirm') { modal.value = { open: true, mode } }
function closeModal() { modal.value = { open: false, mode: null } }

function handleConfirmedReset() {
  G.reset()
  G.clearAnalysis()
}

const showAgentSelector = ref(false)

/* ---- Panel anchor position (near Ask AI button) ---- */
const panelAnchor = ref({ x: 110, y: 144 })

function computePanelAnchor() {
  const btn = toolbarRef.value?.aiBtn
  if (!btn) return
  const r = btn.getBoundingClientRect()
  panelAnchor.value = {
    x: Math.max(8, r.left),
    y: r.bottom + 10,
  }
}

/* ---- Theme init: apply stored accent color on mount ---- */
onMounted(() => {
  document.documentElement.style.setProperty('--accent', G.accentColor)

  // Show agent selector on first visit if no agent chosen
  if (!G.agentId) showAgentSelector.value = true
})

/* ---- Keyboard shortcuts ---- */
function onKey(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  const editable = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)

  if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault()
    if (e.shiftKey) G.redo(); else G.undo()
    return
  }

  // ⌘↵ → analyze
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault(); handleAnalyze(); return
  }

  if (e.key === 'Escape') {
    if (modal.value.open) { closeModal(); return }
    if (showAgentSelector.value) { showAgentSelector.value = false; return }
    if (G.editingId) { G.editingId = null; return }
    if (G.linkFromId) { G.linkFromId = null; return }
    if (G.isAIPanelOpen) { handleCloseAIPanel(); return }
  }
  if (editable) return

  const toolMap: Record<string, 'select' | 'add' | 'link' | 'erase'> = { v: 'select', a: 'add', l: 'link', e: 'erase' }
  const k = e.key.toLowerCase()
  if (toolMap[k]) { G.tool = toolMap[k]; G.linkFromId = null; return }

  if (e.key === 'Tab') {
    e.preventDefault()
    const sel = G.selectedId ?? G.rootNode()?.id
    if (sel) {
      G.addChild(sel, 'new idea')
      nextTick(() => {
        const node = G.nodeById(G.selectedId ?? '')
        if (node) canvasRef.value?.startEdit(node)
      })
    }
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    const node = G.nodeById(G.selectedId ?? '')
    if (node) canvasRef.value?.startEdit(node)
    return
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (G.selectedId && G.selectedId !== G.rootNode()?.id) {
      e.preventDefault(); G.deleteSubtree(G.selectedId)
    }
    return
  }
  if (k === 'f') { e.preventDefault(); canvasRef.value?.fitView(); return }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

/* ---- AI analysis ---- */
const { analyze, abort } = useAIAnalysis()

async function handleAnalyze() {
  if (!G.activeAgent) { showAgentSelector.value = true; return }
  computePanelAnchor()
  G.openAIPanel()
}

async function handleForceAnalyze() {
  G.clearAnalysis()
  await analyze()
}

function handleCloseAIPanel() {
  abort()
  G.closeAIPanel()
}

/* ---- Theme ---- */
function onAccentChange(color: string) {
  G.setAccent(color)
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
        @reset="openModal('confirm')"
      />
      <MindMapSideNote
        @center-on="(id) => canvasRef?.centerOn(id)"
        @start-edit="(id) => { const n = G.nodeById(id); if(n) canvasRef?.startEdit(n) }"
      />

      <!-- Zoom readout -->
      <div class="zoom-readout">
        <button class="zoom-btn" @click="canvasRef?.zoomOut()" title="Zoom out">−</button>
        <span class="zoom-pct">{{ canvasRef?.zoomPct ?? 100 }}%</span>
        <button class="zoom-btn" @click="canvasRef?.zoomIn()" title="Zoom in">+</button>
        <button class="zoom-btn" style="width:auto;padding:0 8px;font-size:18px" @click="canvasRef?.fitView()" title="Fit (F)">fit</button>
      </div>

      <!-- Keyboard hint -->
      <div class="hint">
        <span><kbd>tab</kbd> add child</span>
        <span><kbd>enter</kbd> rename</span>
        <span><kbd>del</kbd> delete</span>
        <span><kbd>⌘Z</kbd> undo</span>
        <span><kbd>⌘↵</kbd> ask AI</span>
        <span><kbd>scroll</kbd> pan · <kbd>⌘</kbd>+<kbd>scroll</kbd> zoom</span>
      </div>

      <!-- AI analysis panel -->
      <AIPanel
        v-if="G.isAIPanelOpen"
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

      <!-- Theme color button (bottom-left, above hint) -->
      <div class="theme-picker-row">
        <span class="theme-picker-label">accent</span>
        <input type="color" class="theme-color-input" :value="G.accentColor" @input="(e) => onAccentChange((e.target as HTMLInputElement).value)" title="Change accent color"/>
      </div>

      <!-- Modal -->
      <MindMapModal
        :open="modal.open"
        :mode="modal.mode"
        @close="closeModal"
        @fit="canvasRef?.fitView()"
        @confirm="handleConfirmedReset"
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
</style>
