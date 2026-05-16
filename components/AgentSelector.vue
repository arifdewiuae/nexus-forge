<template>
  <div class="agent-selector-backdrop" @click.self="emit('close')">
    <div class="agent-selector">
      <h2>choose your AI companion</h2>
      <p>each one sees your mind map differently. pick a personality, then click <strong>✦ ask AI</strong>.</p>

      <div class="agent-cards">
        <div v-for="agent in AGENTS" :key="agent.id"
             class="agent-card"
             :class="{ active: G.agentId === agent.id }"
             @click="select(agent.id)">
          <div class="agent-card-name">{{ agent.name }}</div>
          <div class="agent-card-tagline">{{ agent.tagline }}</div>
          <button class="agent-card-select">
            {{ G.agentId === agent.id ? '✓ selected' : 'select' }}
          </button>
        </div>
      </div>

      <div style="margin-top:20px;text-align:right">
        <button class="modal-action primary" @click="confirm" :disabled="!G.agentId">
          {{ G.agentId ? 'done' : 'pick one first' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMindMapStore } from '~/stores/mindMapStore'
import { AGENTS } from '~/lib/ai/types'

const G = useMindMapStore()
const emit = defineEmits<{ close: []; select: [] }>()

function select(id: string) {
  G.setAgent(id)
}

function confirm() {
  if (!G.agentId) return
  emit('select')
  emit('close')
}
</script>
