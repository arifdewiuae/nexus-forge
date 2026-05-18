<template>
  <div v-if="open" class="modal-backdrop" @click="onBackdrop">
    <div class="modal">

      <!-- Export -->
      <template v-if="mode === 'export'">
        <h2>your mind map · as JSON</h2>
        <p>copy this anywhere, or save it as a file.</p>
        <textarea ref="textarea" v-model="text" spellcheck="false"></textarea>
        <div class="modal-actions">
          <span class="modal-status" :class="status.kind">{{ status.text }}</span>
          <button class="modal-action" @click="copyToClipboard">copy</button>
          <button class="modal-action" @click="download">download .json</button>
          <button class="modal-action primary" @click="emit('close')">done</button>
        </div>
      </template>

      <!-- Import -->
      <template v-else-if="mode === 'import'">
        <h2>paste JSON to import</h2>
        <p>this replaces the current board. undo will get it back.</p>
        <textarea ref="textarea" v-model="text" placeholder='{ "title": "…", "nodes": [ … ] }' spellcheck="false"></textarea>
        <div class="modal-actions">
          <span class="modal-status" :class="status.kind">{{ status.text }}</span>
          <button class="modal-action" @click="emit('close')">cancel</button>
          <button class="modal-action primary" @click="doImport" :disabled="!text">import</button>
        </div>
      </template>

      <!-- Confirm reset -->
      <template v-else-if="mode === 'confirm'">
        <h2>clear the board?</h2>
        <p>this will erase everything and start fresh. undo won't work after this.</p>
        <div class="modal-actions">
          <button class="modal-action" @click="emit('close')">cancel</button>
          <button class="modal-action danger" @click="emit('confirm'); emit('close')">yes, clear it</button>
        </div>
      </template>

      <!-- Help -->
      <template v-else-if="mode === 'help'">
        <h2>quick tour</h2>
        <p style="font-size:16px;line-height:1.55;color:var(--ink)">
          <strong>click</strong> a thought to select it · <strong>drag</strong> to move ·
          <strong>double-click</strong> to rename.<br/>
          <kbd>tab</kbd> add a child · <kbd>del</kbd> delete · <kbd>enter</kbd> rename.<br/>
          toolbar has <em>+ node</em> (place thoughts anywhere), <em>↗ link</em> (re-parent:
          click one then another), <em>✗ erase</em>.<br/>
          <kbd>scroll</kbd> to pan · <kbd>⌘</kbd>+<kbd>scroll</kbd> to zoom · <kbd>drag</kbd> empty space to pan.<br/>
          <strong>✦ ask AI</strong> — pick a robot, then let it analyze and extend your map.<br/>
          everything auto-saves in your browser.
        </p>
        <div class="modal-actions">
          <button class="modal-action primary" @click="emit('close')">got it</button>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useMindMapStore } from '~/stores/mindMapStore'

const props = defineProps<{ open: boolean; mode: 'export' | 'import' | 'help' | 'confirm' | null }>()
const emit = defineEmits<{ close: []; fit: []; confirm: [] }>()
const G = useMindMapStore()

const text = ref('')
const status = ref({ kind: '', text: '' })
const textarea = ref<HTMLTextAreaElement | null>(null)

watch(() => props.open, (v) => {
  if (!v) return
  status.value = { kind: '', text: '' }
  if (props.mode === 'export') {
    text.value = G.exportJSON()
    nextTick(() => { textarea.value?.focus(); textarea.value?.select() })
  } else if (props.mode === 'import') {
    text.value = ''
    nextTick(() => textarea.value?.focus())
  }
})

function copyToClipboard() {
  navigator.clipboard?.writeText(text.value)
    .then(() => { status.value = { kind: 'success', text: 'copied to clipboard' } })
    .catch(() => { status.value = { kind: 'error', text: 'could not copy' } })
}

function download() {
  const blob = new Blob([text.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safeTitle = (G.title || 'mindmap').replace(/[^a-z0-9_\-]+/gi, '_')
  a.href = url; a.download = `${safeTitle}.json`
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
  status.value = { kind: 'success', text: 'downloaded' }
}

function doImport() {
  const res = G.importJSON(text.value)
  if (res.ok) {
    status.value = { kind: 'success', text: 'imported!' }
    setTimeout(() => { emit('close'); emit('fit') }, 700)
  } else {
    status.value = { kind: 'error', text: 'invalid: ' + res.error }
  }
}

function onBackdrop(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}
</script>
