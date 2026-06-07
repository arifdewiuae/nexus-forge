<template>
  <div class="header">
    <div style="display:flex;align-items:baseline;gap:0;flex-wrap:wrap">
      <span ref="titleEl"
            class="header-title"
            contenteditable="plaintext-only"
            role="textbox"
            aria-label="Board title"
            spellcheck="false"
            @blur="commitTitle"
            @keydown="onTitleKey"></span>
      <span class="header-em">—</span>
      <span class="header-date">{{ dateStr }}</span>
    </div>
    <div class="header-meta">
      <span class="save-indicator" :class="graph.saveStatus === 'saved' ? 'saved' : 'dirty'">
        <span class="save-dot"></span>{{ saveLabel }}
      </span>
      <span>·  {{ graph.nodes.length }} thoughts</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

const graph = useGraphStore()
const titleEl = ref<HTMLElement | null>(null)

watch(() => graph.title, (v) => {
  if (titleEl.value && document.activeElement !== titleEl.value) {
    titleEl.value.textContent = v
  }
})

function commitTitle() {
  const v = (titleEl.value?.textContent || '').trim() || 'untitled'
  graph.setTitle(v)
  if (titleEl.value && titleEl.value.textContent !== v) titleEl.value.textContent = v
}

function onTitleKey(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); titleEl.value?.blur() }
  else if (e.key === 'Escape') {
    if (titleEl.value) titleEl.value.textContent = graph.title
    titleEl.value?.blur()
  }
}

function fmtDate() {
  const d = new Date()
  const day = d.toLocaleDateString(undefined, { weekday: 'short' }).toLowerCase()
  const mon = d.toLocaleDateString(undefined, { month: 'short' }).toLowerCase()
  return `${day}, ${mon} ${d.getDate()}`
}
const dateStr = fmtDate()

const saveLabel = computed(() => {
  if (graph.saveStatus === 'saving') return 'saving…'
  if (graph.saveStatus === 'saved') return 'all saved'
  return 'unsaved'
})

onMounted(() => {
  if (titleEl.value) titleEl.value.textContent = graph.title
})
</script>
