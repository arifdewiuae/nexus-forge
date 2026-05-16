<template>
  <div class="header">
    <div style="display:flex;align-items:baseline;gap:0;flex-wrap:wrap">
      <span ref="titleEl"
            class="header-title"
            contenteditable="plaintext-only"
            spellcheck="false"
            @blur="commitTitle"
            @keydown="onTitleKey"></span>
      <span class="header-em">—</span>
      <span class="header-date">{{ dateStr }}</span>
    </div>
    <div class="header-meta">
      <span class="save-indicator" :class="G.saveStatus === 'saved' ? 'saved' : 'dirty'">
        <span class="save-dot"></span>{{ saveLabel }}
      </span>
      <span>·  {{ G.nodes.length }} thoughts</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useMindMapStore } from '~/stores/mindMapStore'

const G = useMindMapStore()
const titleEl = ref<HTMLElement | null>(null)

watch(() => G.title, (v) => {
  if (titleEl.value && document.activeElement !== titleEl.value) {
    titleEl.value.textContent = v
  }
})

function commitTitle() {
  const v = (titleEl.value?.textContent || '').trim() || 'untitled'
  G.setTitle(v)
  if (titleEl.value && titleEl.value.textContent !== v) titleEl.value.textContent = v
}

function onTitleKey(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); titleEl.value?.blur() }
  else if (e.key === 'Escape') {
    if (titleEl.value) titleEl.value.textContent = G.title
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
  if (G.saveStatus === 'saving') return 'saving…'
  if (G.saveStatus === 'saved') return 'all saved'
  return 'unsaved'
})

onMounted(() => {
  if (titleEl.value) titleEl.value.textContent = G.title
})
</script>
