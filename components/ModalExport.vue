<template>
  <div>
    <h2>your mind map · as JSON</h2>
    <p>copy this anywhere, or save it as a file.</p>
    <textarea ref="textarea" v-model="text" spellcheck="false" aria-label="Exported mind map JSON"></textarea>
    <div class="modal-actions">
      <span class="modal-status" :class="status.kind">{{ status.text }}</span>
      <button class="modal-action" @click="copyToClipboard">copy</button>
      <button class="modal-action" @click="download">download .json</button>
      <button class="modal-action" @click="emit('exportpng'); emit('close')">↓ png</button>
      <button class="modal-action primary" @click="emit('close')">done</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

const emit = defineEmits<{ close: []; exportpng: [] }>()
const graph = useGraphStore()

const text = ref(graph.exportJSON())
const status = ref({ kind: '', text: '' })
const textarea = ref<HTMLTextAreaElement | null>(null)

onMounted(() => nextTick(() => { textarea.value?.focus(); textarea.value?.select() }))

function copyToClipboard() {
  navigator.clipboard?.writeText(text.value)
    .then(() => { status.value = { kind: 'success', text: 'copied to clipboard' } })
    .catch(() => { status.value = { kind: 'error', text: 'could not copy' } })
}

function download() {
  const blob = new Blob([text.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safeTitle = (graph.title || 'mindmap').replace(/[^a-z0-9_\-]+/gi, '_')
  a.href = url; a.download = `${safeTitle}.json`
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
  status.value = { kind: 'success', text: 'downloaded' }
}
</script>
