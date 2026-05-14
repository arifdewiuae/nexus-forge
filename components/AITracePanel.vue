<script setup lang="ts">
import { X, Sparkles, Loader2 } from 'lucide-vue-next'
import type { BoardAction } from '~/lib/ai/types'

defineProps<{
  onApplyAction: (action: BoardAction) => void
}>()

const store = useBoardStore()
</script>

<template>
  <aside
    :class="[
      'flex flex-col shrink-0 bg-slate-900 border-l border-slate-800 overflow-hidden transition-[width] duration-300',
      store.isTracePanelOpen ? 'w-80' : 'w-0',
    ]"
    aria-label="AI trace panel"
  >
    <div class="flex flex-col h-full w-80">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
        <div class="flex items-center gap-2">
          <Sparkles :size="16" class="text-violet-400" />
          <span class="text-sm font-medium text-slate-200">AI Analysis</span>
        </div>
        <button
          aria-label="Close AI panel"
          class="text-slate-500 hover:text-slate-300 transition-colors"
          @click="store.closeTracePanel"
        >
          <X :size="16" />
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-4">

        <!-- Analyzing spinner -->
        <div v-if="store.isAnalyzing && !store.streamingThinking" class="flex items-center gap-2 text-slate-400">
          <Loader2 :size="14" class="animate-spin" />
          <span class="text-sm">Analyzing board…</span>
        </div>

        <!-- Streaming thinking text -->
        <div v-if="store.streamingThinking" class="rounded-lg bg-slate-800/60 p-3">
          <p class="text-xs font-medium text-violet-400 mb-2 uppercase tracking-wide">Reasoning</p>
          <p class="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{{ store.streamingThinking }}</p>
          <!-- Blinking cursor while streaming -->
          <span v-if="store.isAnalyzing" class="inline-block w-1.5 h-3.5 bg-violet-400 animate-pulse ml-0.5 align-middle" />
        </div>

        <!-- Suggestion cards -->
        <div v-if="store.suggestions.length">
          <p class="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
            Suggestions ({{ store.suggestions.length }})
          </p>
          <div class="space-y-1.5">
            <SuggestionCard
              v-for="(action, i) in store.suggestions"
              :key="i"
              :action="action"
              :on-apply="onApplyAction"
            />
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="!store.isAnalyzing && !store.streamingThinking && !store.suggestions.length"
          class="flex flex-col items-center justify-center py-12 text-center gap-3"
        >
          <Sparkles :size="32" class="text-slate-700" />
          <p class="text-sm text-slate-500">
            Click <span class="text-violet-400 font-medium">Analyze Board</span> to get AI suggestions.
          </p>
        </div>
      </div>

      <!-- Footer: cost/latency after done -->
      <div
        v-if="store.analysisResult"
        class="px-4 py-2 border-t border-slate-800 shrink-0 text-xs text-slate-500 flex items-center gap-2"
      >
        <span>{{ store.analysisResult.tokensUsed.toLocaleString() }} tokens</span>
        <span class="text-slate-700">·</span>
        <span>${{ store.analysisResult.costUsd.toFixed(4) }}</span>
        <span class="text-slate-700">·</span>
        <span>{{ (store.analysisResult.latencyMs / 1000).toFixed(1) }}s</span>
      </div>
    </div>
  </aside>
</template>
