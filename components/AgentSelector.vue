<template>
  <div class="agent-selector-backdrop" @click.self="emit('close')">
    <div class="agent-selector">
      <h2>choose your AI companion</h2>
      <p>each one sees your mind map differently. pick a personality, then click <strong>✦ ask AI</strong>.</p>

      <div class="agent-cards">
        <div v-for="agent in AGENTS" :key="agent.id"
             class="agent-card"
             :class="{ active: ai.agentId === agent.id }"
             @click="select(agent.id)">
          <div class="agent-card-name">{{ agent.name }}</div>
          <div class="agent-card-tagline">{{ agent.tagline }}</div>
          <button class="agent-card-select">
            {{ ai.agentId === agent.id ? '✓ selected' : 'select' }}
          </button>
        </div>
      </div>

      <div class="agent-selector-footer">
        <button class="modal-action primary" @click="confirm" :disabled="!ai.agentId">
          {{ ai.agentId ? 'done' : 'pick one first' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AGENTS } from '~/lib/ai/types'

const ai = useAIStore()
const emit = defineEmits<{ close: []; select: [] }>()

function select(id: string) {
  ai.setAgent(id)
}

function confirm() {
  if (!ai.agentId) return
  emit('select')
  emit('close')
}
</script>

<style scoped>
.agent-selector-footer {
  margin-top: 20px;
  text-align: right;
}
</style>
