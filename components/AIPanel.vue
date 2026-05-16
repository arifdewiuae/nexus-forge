<template>
  <aside class="ai-panel">
    <div class="ai-panel-card">
      <button class="ai-close-btn" @click="emit('close')" title="Close">✕</button>

      <h3 class="ai-panel-title">
        {{ G.isAnalyzing ? '⟳ thinking…' : '✦ AI insights' }}
      </h3>
      <p class="ai-panel-agent" v-if="G.activeAgent">{{ G.activeAgent.name }}</p>

      <!-- Streaming thinking text -->
      <div v-if="G.streamingThinking" class="ai-thinking" ref="thinkingEl">{{ G.streamingThinking }}</div>
      <div v-else-if="!G.isAnalyzing && !G.suggestions.length" class="ai-thinking" style="color:var(--muted);font-style:italic">
        Click <strong>✦ ask AI</strong> in the toolbar to analyze your map.
      </div>

      <!-- Suggestions -->
      <div v-if="G.suggestions.length" class="ai-suggestions">
        <div v-for="(action, i) in G.suggestions" :key="i" class="ai-suggestion-item">
          <div class="ai-suggestion-kind">{{ kindLabel(action.kind) }}</div>
          <div class="ai-suggestion-text">{{ describeAction(action) }}</div>
          <button class="ai-suggestion-btn" @click="applyAction(action)">apply</button>
        </div>
      </div>

      <!-- Stats -->
      <div v-if="G.analysisResult && !G.isAnalyzing" class="ai-stats">
        {{ G.analysisResult.tokensUsed.toLocaleString() }} tokens ·
        ${{ G.analysisResult.costUsd.toFixed(4) }} ·
        {{ (G.analysisResult.latencyMs / 1000).toFixed(1) }}s
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useMindMapStore } from '~/stores/mindMapStore'
import { applyAction as applyMindMapAction } from '~/lib/mindmap/applier'
import type { MindMapAction } from '~/lib/ai/types'

const G = useMindMapStore()
const emit = defineEmits<{ close: [] }>()
const thinkingEl = ref<HTMLElement | null>(null)

watch(() => G.streamingThinking, () => {
  nextTick(() => {
    if (thinkingEl.value) thinkingEl.value.scrollTop = thinkingEl.value.scrollHeight
  })
})

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
.ai-stats {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(31,37,51,0.12);
  font-family: 'Kalam', cursive;
  font-size: 12px;
  color: var(--muted);
}
</style>
