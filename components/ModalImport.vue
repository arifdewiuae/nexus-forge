<template>
  <div>
    <h2>paste JSON to import</h2>
    <p>this replaces the current board. undo will get it back.</p>
    <textarea ref="textarea" v-model="text" placeholder='{ "title": "…", "nodes": [ … ] }' spellcheck="false" aria-label="Paste JSON to import"></textarea>
    <div class="modal-actions">
      <span class="modal-status" :class="status.kind">{{ status.text }}</span>
      <button class="modal-action" @click="emit('close')">cancel</button>
      <button class="modal-action primary" @click="doImport" :disabled="!text">import</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

const emit = defineEmits<{ close: []; fit: [] }>()
const graph = useGraphStore()

const text = ref('')
const status = ref({ kind: '', text: '' })
const textarea = ref<HTMLTextAreaElement | null>(null)

onMounted(() => nextTick(() => textarea.value?.focus()))

function doImport() {
  const res = graph.importJSON(text.value)
  if (res.ok) {
    status.value = { kind: 'success', text: 'imported!' }
    setTimeout(() => { emit('close'); emit('fit') }, 700)
  } else {
    status.value = { kind: 'error', text: 'invalid: ' + res.error }
  }
}
</script>
