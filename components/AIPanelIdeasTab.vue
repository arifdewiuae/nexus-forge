<template>
  <div class="ai-tab-body ai-tab-body--ideas">
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
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { renderSafeMarkdown } from '~/lib/markdown/safeInline'
import { useSuggestionState } from '~/composables/useSuggestionState'
import { stripSuggesterJson } from '~/lib/ai/thinking'
import type { MindMapAction } from '~/lib/ai/types'

const emit = defineEmits<{ analyze: [] }>()
const graph = useGraphStore()
const ai = useAIStore()
const thinkingEl = ref<HTMLElement | null>(null)

// Prefer the live stream while analyzing; fall back to the captured result once done,
// so the reasoning text stays visible after the stream ends.
const thinkingText = computed(() =>
  stripSuggesterJson(ai.streamingThinking || ai.analysisResult?.thinking || ''),
)
const thinkingCollapsed = ref(false)

// Reset collapse when a fresh analysis begins so reasoning streams visibly.
watch(() => ai.isAnalyzing, (analyzing) => {
  if (analyzing) thinkingCollapsed.value = false
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

/* ---- Footer ---- */
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
  .ai-tab-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .ai-tab-body--ideas {
    max-height: none;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
