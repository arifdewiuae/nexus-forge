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

      <!-- ── INPUT TAB ── -->
      <div v-if="view === 'input'" class="ai-tab-body ai-tab-body--input">

        <div class="ai-tab-scroll">
          <!-- Analyze current map -->
          <button
            class="ai-analyze-btn"
            :disabled="ai.isAnalyzing"
            @click="submitAnalyze"
          >
            {{ ai.isAnalyzing ? '⟳ thinking…' : (ai.analysisResult ? '↻ re-analyze map' : '✦ analyze my map') }}
          </button>
          <div class="ai-analyze-hint">AI reads your current board and suggests ideas</div>

          <div class="ai-divider"><span>or give it a brain dump</span></div>

          <!-- Brain dump -->
          <div class="ai-prompt-input-row">
            <textarea
              class="ai-prompt-textarea"
              v-model="ai.userPrompt"
              placeholder="type or speak… AI will build the map"
              rows="3"
              :disabled="ai.isAnalyzing"
              @keydown.meta.enter.prevent="submitWithPrompt"
              @keydown.ctrl.enter.prevent="submitWithPrompt"
            ></textarea>
            <button
              class="ai-mic-btn"
              :class="{ listening: isListening }"
              @click="toggleMic"
              :aria-label="isListening ? 'Stop voice input' : 'Start voice input'"
              :title="isListening ? 'stop recording' : 'speak your thoughts'"
            >
              {{ isListening ? '⏹' : '🎙' }}
            </button>
          </div>
          <div v-if="micError" class="ai-mic-error">{{ micError }}</div>
        </div>

        <div class="ai-input-footer">
          <button
            class="ai-submit-btn"
            :disabled="ai.isAnalyzing || !ai.userPrompt.trim()"
            @click="submitWithPrompt"
          >
            {{ ai.isAnalyzing ? '⟳ thinking…' : 'build map →' }}
          </button>
          <div class="ai-submit-hint">or ⌘↵</div>
        </div>
      </div>

      <!-- ── IDEAS TAB ── -->
      <div v-else class="ai-tab-body ai-tab-body--ideas">
        <!-- Reasoning text (live during stream, persists after done) -->
        <div v-if="thinkingText" class="ai-thinking-section">
          <button
            v-if="!ai.isAnalyzing"
            class="ai-thinking-toggle"
            :aria-label="thinkingCollapsed ? 'Show AI reasoning' : 'Hide AI reasoning'"
            :aria-expanded="!thinkingCollapsed"
            @click="thinkingCollapsed = !thinkingCollapsed"
          >
            {{ thinkingCollapsed ? '▶ show reasoning' : '▼ reasoning' }}
          </button>
          <div
            v-show="ai.isAnalyzing || !thinkingCollapsed"
            class="ai-thinking"
            ref="thinkingEl"
            v-html="renderMarkdown(thinkingText)"
          ></div>
        </div>
        <div v-else-if="!ai.isAnalyzing && !ai.suggestions.length" class="ai-thinking ai-thinking--empty">
          No ideas yet — switch to the <strong>input</strong> tab and hit <em>build map</em>.
        </div>

        <!-- Suggestions -->
        <div v-if="ai.suggestions.length" class="ai-suggestions">
          <template v-for="(action, i) in ai.suggestions" :key="i">
            <AISuggestionCard
              v-if="!rejectedSet.has(i)"
              :action="action"
              :applied="appliedSet.has(i)"
              @apply="doApply(action, i)"
              @undo="undoApply(i)"
              @reject="rejectAction(i)"
            />
          </template>
        </div>

        <!-- Stats + re-analyze -->
        <div class="ai-footer" v-if="!ai.isAnalyzing">
          <div v-if="ai.analysisResult" class="ai-stats">
            {{ ai.analysisResult.tokensUsed.toLocaleString() }} tokens ·
            ${{ ai.analysisResult.costUsd.toFixed(4) }} ·
            {{ (ai.analysisResult.latencyMs / 1000).toFixed(1) }}s
          </div>
          <button
            v-if="ai.analysisResult"
            class="ai-reanalyze-btn"
            @click="emit('analyze')"
            title="Run a fresh analysis"
          >↻ re-analyze</button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { renderSafeMarkdown } from '~/lib/markdown/safeInline'
import { useDraggable } from '~/composables/useDraggable'
import { useSpeechRecognition } from '~/composables/useSpeechRecognition'
import { useSuggestionState } from '~/composables/useSuggestionState'
import { stripSuggesterJson } from '~/lib/ai/thinking'
import type { MindMapAction } from '~/lib/ai/types'
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

const graph = useGraphStore()
const ai = useAIStore()
const thinkingEl = ref<HTMLElement | null>(null)

/* ---- Tab state ---- */
const view = ref<'input' | 'ideas'>('input')
const hasResults = computed(() => ai.suggestions.length > 0 || !!ai.analysisResult)

// Prefer the live stream while analyzing; fall back to the captured result once done.
// This ensures the reasoning text stays visible after the stream ends.
const thinkingText = computed(() =>
  stripSuggesterJson(ai.streamingThinking || ai.analysisResult?.thinking || ''),
)
const thinkingCollapsed = ref(false)

// Auto-switch to ideas when analysis starts; reset collapse so reasoning streams visibly
watch(() => ai.isAnalyzing, (analyzing) => {
  if (analyzing) { view.value = 'ideas'; thinkingCollapsed.value = false }
})

/* ---- Submit handlers ---- */
function submitAnalyze() {
  if (ai.isAnalyzing) return
  emit('analyze')
  view.value = 'ideas'
}

function submitWithPrompt() {
  if (ai.isAnalyzing || !ai.userPrompt.trim()) return
  emit('analyze')
  view.value = 'ideas'
}

/* ---- Speech recognition (composable) ---- */
const { isListening, error: micError, toggle: toggleMic, stop: stopMic } = useSpeechRecognition((text) => {
  ai.userPrompt = (ai.userPrompt ? ai.userPrompt + ' ' : '') + text
})

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

watch(() => [props.initialX, props.initialY], ([x, y]) => {
  pos.value = { x, y }
})

onMounted(() => {
  syncMobileSheet()
  mobileMq = window.matchMedia('(max-width: 800px)')
  mobileMq.addEventListener('change', syncMobileSheet)
})

onUnmounted(() => {
  cleanupDrag()
  stopMic()
  mobileMq?.removeEventListener('change', syncMobileSheet)
})

/* ---- Auto-scroll thinking text ---- */
watch(() => ai.streamingThinking, () => {
  nextTick(() => {
    if (thinkingEl.value) thinkingEl.value.scrollTop = thinkingEl.value.scrollHeight
  })
})

/* ---- Markdown renderer ---- */
const renderMarkdown = renderSafeMarkdown

/* ---- Suggestion state (composable) ---- */
const { appliedSet, rejectedSet, apply: applyAction, undo: undoApply, reject: rejectAction } = useSuggestionState(graph, ai)

function doApply(action: MindMapAction, i: number) { applyAction(action, i) }
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

/* ---- Tab body ---- */
.ai-tab-body {
  padding: 10px 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
}

.ai-tab-body--ideas {
  overflow-y: auto;
  max-height: 420px;
}

.ai-tab-body--input {
  min-height: 0;
}

.ai-tab-scroll {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-input-footer {
  flex-shrink: 0;
  padding-top: 4px;
}

/* ---- Input tab ---- */
.ai-analyze-btn {
  font-family: 'Caveat', cursive;
  font-size: 17px;
  background: transparent;
  border: 1.4px solid var(--accent);
  color: var(--accent);
  border-radius: 12px;
  padding: 6px 16px;
  cursor: pointer;
  width: 100%;
  transition: background 0.15s, color 0.15s, opacity 0.15s;
}

.ai-analyze-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

.ai-analyze-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.ai-analyze-hint {
  font-family: 'Kalam', cursive;
  font-size: 11px;
  color: var(--muted);
  text-align: center;
  margin-top: -4px;
}

.ai-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-family: 'Kalam', cursive;
  font-size: 11px;
}

.ai-divider::before,
.ai-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(31,37,51,0.12);
}

.ai-prompt-label {
  font-family: 'Caveat', cursive;
  font-size: 14px;
  color: var(--muted);
}

.ai-prompt-input-row {
  display: flex;
  gap: 6px;
  align-items: flex-start;
}

.ai-prompt-textarea {
  flex: 1;
  font-family: 'Kalam', cursive;
  font-size: 13px;
  line-height: 1.4;
  color: var(--ink);
  background: rgba(255,255,255,0.6);
  border: 1.4px solid rgba(31,37,51,0.18);
  border-radius: 8px;
  padding: 6px 8px;
  resize: none;
  outline: none;
  transition: border-color 0.15s;
}

.ai-prompt-textarea:focus {
  border-color: var(--accent);
}

.ai-prompt-textarea::placeholder {
  color: var(--muted);
  opacity: 0.7;
}

.ai-mic-btn {
  font-size: 18px;
  background: rgba(255,255,255,0.7);
  border: 1.4px solid rgba(31,37,51,0.18);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.15s, background 0.15s;
}

.ai-mic-btn:hover {
  border-color: var(--accent);
}

.ai-mic-btn.listening {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, white);
  animation: mic-pulse 1s ease-in-out infinite;
}

@keyframes mic-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 30%, transparent); }
  50%       { box-shadow: 0 0 0 5px color-mix(in srgb, var(--accent) 0%, transparent); }
}

.ai-mic-error {
  font-family: 'Kalam', cursive;
  font-size: 11px;
  color: #c0392b;
}

.ai-submit-btn {
  font-family: 'Caveat', cursive;
  font-size: 17px;
  background: var(--accent);
  color: white;
  border: 1.4px solid var(--accent);
  border-radius: 12px;
  padding: 6px 16px;
  cursor: pointer;
  width: 100%;
  transition: opacity 0.15s, transform 0.1s;
}

.ai-submit-btn:hover:not(:disabled) {
  opacity: 0.88;
  transform: translateY(-1px);
}

.ai-submit-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.ai-submit-hint {
  font-family: 'Kalam', cursive;
  font-size: 11px;
  color: var(--muted);
  text-align: right;
  margin-top: -4px;
}

/* ---- Thinking section ---- */
.ai-thinking-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ai-thinking-toggle {
  font-family: 'Caveat', cursive;
  font-size: 14px;
  color: var(--muted);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  text-align: left;
  align-self: flex-start;
  line-height: 1;
  transition: color 0.15s;
}

.ai-thinking-toggle:hover {
  color: var(--accent);
}

/* ---- Ideas tab ---- */
.ai-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid rgba(31,37,51,0.12);
  gap: 8px;
}

.ai-stats {
  font-family: 'Kalam', cursive;
  font-size: 12px;
  color: var(--muted);
  flex: 1;
}

.ai-reanalyze-btn {
  font-family: 'Caveat', cursive;
  font-size: 16px;
  background: transparent;
  border: 1.4px solid var(--muted);
  color: var(--muted);
  padding: 1px 10px;
  border-radius: 14px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.ai-reanalyze-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
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
  .ai-tab-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .ai-tab-body--input {
    display: flex;
    flex-direction: column;
  }
  .ai-tab-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .ai-input-footer {
    flex-shrink: 0;
    padding-top: 10px;
    border-top: 1px solid rgba(31,37,51,0.08);
    background: var(--paper-card);
  }
  .ai-drag-bar {
    width: 40px;
    height: 4px;
    background: var(--ink);
    opacity: 0.18;
    border-radius: 2px;
    margin: 0 auto 8px;
  }
  .ai-tab-body--ideas {
    max-height: none;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
