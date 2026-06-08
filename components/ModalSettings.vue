<template>
  <div>
    <h2>your API key</h2>
    <p>stored only in your browser — never sent to our server.</p>
    <div class="key-row">
      <input
        class="key-input"
        :class="{ 'key-input--masked': !showKey }"
        type="text"
        v-model="keyDraft"
        placeholder="fw_..."
        spellcheck="false"
        autocomplete="off"
        aria-label="Fireworks API key"
      />
      <button class="key-toggle" @click="showKey = !showKey"
              :aria-label="showKey ? 'Hide API key' : 'Show API key'">
        {{ showKey ? '○' : '●' }}
      </button>
    </div>
    <p class="key-hint">
      get a key at
      <a href="https://app.fireworks.ai/settings/users/api-keys" target="_blank" rel="noopener noreferrer">fireworks.ai ↗</a>
    </p>
    <div class="modal-actions">
      <button class="modal-action" :disabled="!fireworksKey" @click="clearKey(); emit('close')">clear key</button>
      <button class="modal-action primary" :disabled="!keyDraft.trim()" @click="saveKey(keyDraft); emit('close')">save</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useApiKeys } from '~/composables/useApiKeys'

const emit = defineEmits<{ close: [] }>()

const { fireworksKey, save: saveKey, clear: clearKey } = useApiKeys()
const keyDraft = ref(fireworksKey.value)
const showKey = ref(false)
</script>
