<template>
  <aside
    class="ai-panel"
    :class="{ 'ai-panel--sheet': isMobileSheet }"
    :style="panelStyle"
  >
    <div class="ai-panel-card">
      <!-- Drag handle / header -->
      <div
        class="ai-panel-header"
        :class="{ dragging: isDragging }"
        @mousedown.prevent="startDrag"
      >
        <div class="ai-drag-bar"></div>
        <h3 class="ai-panel-title">
          <template v-if="ai.isAnalyzing">
            <span class="ai-spin-icon">⟳</span>
            <span class="ai-thinking-word"> thinking</span><span class="ai-dots"></span>
          </template>
          <template v-else>✦ AI insights</template>
        </h3>
        <p class="ai-panel-agent" v-if="ai.activeAgent">{{ ai.activeAgent.name }}</p>
      </div>

      <button class="ai-close-btn" @click="emit('close')" aria-label="Close AI panel" title="Close">✕</button>

      <!-- Tabs -->
      <div class="ai-tabs">
        <button
          class="ai-tab"
          :class="{ active: view === 'input' }"
          @click="view = 'input'"
        >input</button>
        <button
          class="ai-tab"
          :class="{ active: view === 'ideas', 'has-results': hasResults }"
          @click="view = 'ideas'"
        >
          ideas
          <span v-if="hasResults && view !== 'ideas'" class="ai-tab-dot"></span>
        </button>
      </div>

      <AIPanelInputTab v-if="view === 'input'" @analyze="onAnalyze" />
      <AIPanelIdeasTab v-else @analyze="emit('analyze')" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useDraggable } from '~/composables/useDraggable'
import { AI_PANEL } from '~/lib/config'

function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 800px)').matches
}

const props = withDefaults(defineProps<{
  initialX?: number
  initialY?: number
}>(), {
  initialX: AI_PANEL.DEFAULT_ANCHOR_X,
  initialY: AI_PANEL.DEFAULT_ANCHOR_Y,
})

const emit = defineEmits<{
  close: []
  analyze: []
}>()

const ai = useAIStore()

/* ---- Tab state ---- */
const view = ref<'input' | 'ideas'>('input')
const hasResults = computed(() => ai.suggestions.length > 0 || !!ai.analysisResult)

// Auto-switch to ideas when analysis starts so the reasoning streams into view.
watch(() => ai.isAnalyzing, (analyzing) => {
  if (analyzing) view.value = 'ideas'
})

// Input tab asks for an analysis → switch to ideas and bubble up.
function onAnalyze() {
  emit('analyze')
  view.value = 'ideas'
}

/* ---- Position & drag (composable) ---- */
const isMobileSheet = ref(false)
const { pos, isDragging, startDrag: startDragRaw, cleanup: cleanupDrag } = useDraggable({ x: props.initialX, y: props.initialY })

const panelStyle = computed(() => {
  if (isMobileSheet.value) return {}
  return { left: `${pos.value.x}px`, top: `${pos.value.y}px` }
})

let mobileMq: MediaQueryList | null = null
function syncMobileSheet() { isMobileSheet.value = isMobileViewport() }

function startDrag(e: MouseEvent) {
  if (isTouchDevice()) return
  startDragRaw(e)
}

watch(() => [props.initialX, props.initialY], () => {
  pos.value = { x: props.initialX, y: props.initialY }
})

onMounted(() => {
  syncMobileSheet()
  mobileMq = window.matchMedia('(max-width: 800px)')
  mobileMq.addEventListener('change', syncMobileSheet)
})

onUnmounted(() => {
  cleanupDrag()
  mobileMq?.removeEventListener('change', syncMobileSheet)
})
</script>

<style scoped>
/* ---- Thinking animation ---- */
.ai-spin-icon {
  display: inline-block;
  animation: ai-spin 1s linear infinite;
  transform-origin: center;
}

@keyframes ai-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.ai-thinking-word {
  animation: ai-pulse 1.6s ease-in-out infinite;
}

@keyframes ai-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.45; }
}

.ai-dots::after {
  content: '';
  animation: ai-dots-cycle 1.5s steps(4, end) infinite;
}

@keyframes ai-dots-cycle {
  0%   { content: ''; }
  25%  { content: '.'; }
  50%  { content: '..'; }
  75%  { content: '...'; }
}

/* ---- Tabs ---- */
.ai-tabs {
  display: flex;
  gap: 2px;
  padding: 0 12px 8px;
  border-bottom: 1px solid rgba(31,37,51,0.10);
  margin-bottom: 2px;
}

.ai-tab {
  font-family: 'Caveat', cursive;
  font-size: 15px;
  background: transparent;
  border: 1.4px solid transparent;
  border-radius: 10px;
  padding: 2px 12px;
  cursor: pointer;
  color: var(--muted);
  position: relative;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.ai-tab:hover {
  color: var(--ink);
}

.ai-tab.active {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.ai-tab-dot {
  position: absolute;
  top: 4px;
  right: 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}

/* ---- Mobile: bottom sheet ---- */
@media (max-width: 800px) {
  .ai-panel--sheet {
    position: fixed !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    top: auto !important;
    width: 100% !important;
    z-index: 30;
  }
  .ai-panel-card {
    display: flex;
    flex-direction: column;
    border-radius: 18px 18px 0 0;
    max-height: min(78dvh, calc(100dvh - env(safe-area-inset-top, 0px) - 52px));
    overflow: hidden;
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  }
  .ai-panel-header {
    cursor: default;
    touch-action: none;
    flex-shrink: 0;
  }
  .ai-tabs {
    flex-shrink: 0;
  }
  .ai-drag-bar {
    width: 40px;
    height: 4px;
    background: var(--ink);
    opacity: 0.18;
    border-radius: 2px;
    margin: 0 auto 8px;
  }
}
</style>
