<template>
  <aside
    class="ai-panel"
    :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
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
          <template v-if="G.isAnalyzing">
            <span class="ai-spin-icon">⟳</span>
            <span class="ai-thinking-word"> thinking</span><span class="ai-dots"></span>
          </template>
          <template v-else>✦ AI insights</template>
        </h3>
        <p class="ai-panel-agent" v-if="G.activeAgent">{{ G.activeAgent.name }}</p>
      </div>

      <button class="ai-close-btn" @click="emit('close')" title="Close">✕</button>

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
      <div v-if="view === 'input'" class="ai-tab-body">
        <div class="ai-prompt-label">what's on your mind?</div>
        <div class="ai-prompt-input-row">
          <textarea
            class="ai-prompt-textarea"
            v-model="G.userPrompt"
            placeholder="type or speak a brain dump… AI will build the map"
            rows="4"
            :disabled="G.isAnalyzing"
            @keydown.meta.enter.prevent="submitAnalyze"
            @keydown.ctrl.enter.prevent="submitAnalyze"
          ></textarea>
          <button
            class="ai-mic-btn"
            :class="{ listening: isListening }"
            @click="toggleMic"
            :title="isListening ? 'stop recording' : 'speak your thoughts'"
          >
            {{ isListening ? '⏹' : '🎙' }}
          </button>
        </div>
        <div v-if="micError" class="ai-mic-error">{{ micError }}</div>

        <button
          class="ai-submit-btn"
          :disabled="G.isAnalyzing"
          @click="submitAnalyze"
        >
          {{ G.isAnalyzing ? '⟳ thinking…' : (G.analysisResult ? '↻ re-analyze' : 'build map →') }}
        </button>
        <div class="ai-submit-hint">or ⌘↵</div>
      </div>

      <!-- ── IDEAS TAB ── -->
      <div v-else class="ai-tab-body ai-tab-body--ideas">
        <!-- Streaming thinking text -->
        <div
          v-if="G.streamingThinking"
          class="ai-thinking"
          ref="thinkingEl"
          v-html="renderMarkdown(G.streamingThinking)"
        ></div>
        <div v-else-if="!G.isAnalyzing && !G.suggestions.length" class="ai-thinking ai-thinking--empty">
          No ideas yet — switch to the <strong>input</strong> tab and hit <em>build map</em>.
        </div>

        <!-- Suggestions -->
        <div v-if="G.suggestions.length" class="ai-suggestions">
          <div v-for="(action, i) in G.suggestions" :key="i" class="ai-suggestion-item">
            <div class="ai-suggestion-kind">{{ kindLabel(action.kind) }}</div>
            <div class="ai-suggestion-text">{{ describeAction(action) }}</div>
            <button class="ai-suggestion-btn" @click="applyAction(action)">apply</button>
          </div>
        </div>

        <!-- Stats + re-analyze -->
        <div class="ai-footer" v-if="!G.isAnalyzing">
          <div v-if="G.analysisResult" class="ai-stats">
            {{ G.analysisResult.tokensUsed.toLocaleString() }} tokens ·
            ${{ G.analysisResult.costUsd.toFixed(4) }} ·
            {{ (G.analysisResult.latencyMs / 1000).toFixed(1) }}s
          </div>
          <button
            v-if="G.analysisResult"
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
import { useMindMapStore } from '~/stores/mindMapStore'
import { applyAction as applyMindMapAction } from '~/lib/mindmap/applier'
import type { MindMapAction } from '~/lib/ai/types'

const props = withDefaults(defineProps<{
  initialX?: number
  initialY?: number
}>(), {
  initialX: 110,
  initialY: 144,
})

const emit = defineEmits<{
  close: []
  analyze: []
}>()

const G = useMindMapStore()
const thinkingEl = ref<HTMLElement | null>(null)

/* ---- Tab state ---- */
const view = ref<'input' | 'ideas'>('input')
const hasResults = computed(() => G.suggestions.length > 0 || !!G.analysisResult)

// Auto-switch to ideas when analysis starts; stay there when done
watch(() => G.isAnalyzing, (analyzing) => {
  if (analyzing) view.value = 'ideas'
})

/* ---- Submit (from input tab) ---- */
function submitAnalyze() {
  if (G.isAnalyzing) return
  emit('analyze')
  view.value = 'ideas'
}

/* ---- Speech recognition ---- */
const isListening = ref(false)
const micError    = ref('')
let recognition: any = null

function toggleMic() {
  if (isListening.value) {
    recognition?.stop()
    return
  }
  micError.value = ''
  const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
  if (!SR) {
    micError.value = 'Speech recognition not supported in this browser.'
    return
  }
  recognition = new SR()
  recognition.lang = 'en-US'
  recognition.continuous = true
  recognition.interimResults = false

  recognition.onstart  = () => { isListening.value = true }
  recognition.onend    = () => { isListening.value = false }
  recognition.onerror  = (e: any) => {
    isListening.value = false
    if (e.error !== 'aborted') micError.value = `Mic error: ${e.error}`
  }
  recognition.onresult = (e: any) => {
    const transcript = Array.from(e.results as any[])
      .map((r: any) => r[0].transcript)
      .join(' ')
    G.userPrompt = (G.userPrompt ? G.userPrompt + ' ' : '') + transcript
  }
  recognition.start()
}

/* ---- Position & drag ---- */
const pos = ref({ x: props.initialX, y: props.initialY })
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

watch(() => [props.initialX, props.initialY], ([x, y]) => {
  pos.value = { x, y }
})

function startDrag(e: MouseEvent) {
  isDragging.value = true
  dragOffset.value = { x: e.clientX - pos.value.x, y: e.clientY - pos.value.y }
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  pos.value = {
    x: Math.max(0, e.clientX - dragOffset.value.x),
    y: Math.max(0, e.clientY - dragOffset.value.y),
  }
}

function onMouseUp() {
  isDragging.value = false
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  recognition?.stop()
})

/* ---- Auto-scroll thinking text ---- */
watch(() => G.streamingThinking, () => {
  nextTick(() => {
    if (thinkingEl.value) thinkingEl.value.scrollTop = thinkingEl.value.scrollHeight
  })
})

/* ---- Markdown renderer ---- */
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\n/g, '<br>')
}

/* ---- Action helpers ---- */
function kindLabel(kind: string): string {
  const labels: Record<string, string> = {
    add_node:      '+ new node',
    link_nodes:    '↗ link nodes',
    relabel:       '✎ rename',
    highlight:     '◎ flag',
    expand_branch: '⊕ expand branch',
  }
  return labels[kind] ?? kind
}

function describeAction(action: MindMapAction): string {
  switch (action.kind) {
    case 'add_node': {
      const parent = G.nodeById(action.parentId)
      return `Add "${action.label}" under "${parent?.label ?? action.parentId}"${action.description ? ' — ' + action.description : ''}`
    }
    case 'link_nodes': {
      const from = G.nodeById(action.fromId)
      const to   = G.nodeById(action.toId)
      return `Link "${from?.label ?? action.fromId}" → "${to?.label ?? action.toId}"`
    }
    case 'relabel': {
      const node = G.nodeById(action.nodeId)
      return `Rename "${node?.label ?? action.nodeId}" → "${action.label}"`
    }
    case 'highlight':
      return action.reason
    case 'expand_branch': {
      const parent = G.nodeById(action.parentId)
      return `Expand "${parent?.label ?? action.parentId}" with ${action.children.length} new child nodes`
    }
    default:
      return JSON.stringify(action)
  }
}

function applyAction(action: MindMapAction) {
  applyMindMapAction(G, action)
}
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

/* ---- Input tab ---- */
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
  border: none;
  border-radius: 12px;
  padding: 6px 16px;
  cursor: pointer;
  align-self: flex-end;
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
</style>
