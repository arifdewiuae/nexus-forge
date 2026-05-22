<template>
  <aside class="side-note" v-if="selected" :class="{ 'sheet-collapsed': sheetCollapsed }">
    <div class="side-note-card" ref="cardEl">
      <!-- Mobile bottom-sheet handle (tap to expand/collapse) -->
      <button class="sheet-handle" @click="sheetCollapsed = !sheetCollapsed" aria-label="Toggle details">
        <span class="sheet-handle-bar"></span>
        <span class="sheet-handle-label">{{ selected.label }}</span>
        <span class="sheet-handle-arrow">{{ sheetCollapsed ? '▲' : '▼' }}</span>
      </button>
      <svg class="side-note-card-bg" preserveAspectRatio="none" :viewBox="`0 0 ${cardSize.w} ${cardSize.h}`">
        <path :d="cardPath" filter="url(#wobble)"/>
      </svg>
      <div class="side-note-content">
        <div class="side-label-row">
          <input ref="labelInput"
                 class="side-label"
                 :class="{ 'side-label--editing': editingLabel }"
                 v-model="draft"
                 :readonly="!editingLabel"
                 @blur="editingLabel && commitLabel()"
                 @keydown="editingLabel && onLabelKey($event)"
                 @dblclick="startLabelEdit"
                 maxlength="120"/>
          <button class="side-pencil" @mousedown.prevent @click="editingLabel ? commitLabel() : startLabelEdit()" :title="editingLabel ? 'Save' : 'Edit label'">{{ editingLabel ? '✓' : '✎' }}</button>
        </div>
        <div class="side-breadcrumb">
          <template v-if="ancestors.length">
            <span v-for="(a, i) in ancestors" :key="a.id">
              <span class="side-breadcrumb-link" @click="jumpTo(a.id)">{{ a.label }}</span>
              <span v-if="i < ancestors.length - 1"> › </span>
            </span>
            <span> ›  </span>
          </template>
          · {{ branchLabel }}
        </div>

        <div class="side-section">relations:</div>
        <ul class="side-children">
          <li v-if="!parentNode && !children.length && !crossLinked.length" class="empty">(nothing yet…)</li>
          <li v-if="parentNode" class="parent-link cross-link-item">
            <span @click="jumpTo(parentNode.id)">↑ branch: {{ parentNode.label }}</span>
            <button v-if="!isRoot" class="unlink-btn" @click.stop="detachFromParent" title="Detach from parent">✕</button>
          </li>
          <li v-for="c in children" :key="c.id" @click="jumpTo(c.id)">↓ branch: {{ c.label }}</li>
          <li v-for="cl in crossLinked" :key="cl.linkId" class="cross-link-item">
            <span @click="jumpTo(cl.node.id)">⤳ connect: {{ cl.node.label }}</span>
            <button class="unlink-btn" @click.stop="G.removeCrossLink(cl.linkId)" title="Remove connection">✕</button>
          </li>
        </ul>

        <div class="side-actions">
          <button class="side-action-btn" @click="addChildHere">+ add child</button>
          <button class="side-action-btn" @click="startLabelEdit">✎ rename</button>
          <button class="side-action-btn danger" @click="deleteHere" :disabled="isRoot">✗ delete</button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useMindMapStore } from '~/stores/mindMapStore'

const G = useMindMapStore()
const emit = defineEmits<{ centerOn: [id: string]; startEdit: [id: string] }>()

const labelInput = ref<HTMLInputElement | null>(null)
const editingLabel = ref(false)
const draft = ref(G.nodeById(G.selectedId ?? '')?.label ?? '')

function isMobileBreakpoint(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 1100px)').matches
}
const sheetCollapsed = ref(isMobileBreakpoint())
const cardEl = ref<HTMLElement | null>(null)
const cardSize = ref({ w: 268, h: 320 })

const selected    = computed(() => G.nodeById(G.selectedId ?? ''))
const ancestors   = computed(() => G.ancestorsOf(G.selectedId ?? ''))
const children    = computed(() => G.childrenOf(G.selectedId ?? ''))
const isRoot      = computed(() => G.selectedId === G.rootNode()?.id)
const parentNode  = computed(() => {
  const p = selected.value?.parent
  return p ? G.nodeById(p) : null
})

const crossLinked = computed(() => {
  const id = G.selectedId ?? ''
  return G.crossLinksOf(id).map(cl => {
    const otherId = cl.fromId === id ? cl.toId : cl.fromId
    const node = G.nodeById(otherId)
    return node ? { node, linkId: cl.id } : null
  }).filter(Boolean) as { node: { id: string; label: string }; linkId: string }[]
})

const branchLabel = computed(() => {
  const lvl = G.levelOf(G.selectedId ?? '')
  if (lvl === 0) return 'root thought'
  if (lvl === 1) return 'main branch'
  return `leaf · level ${lvl}`
})

function startLabelEdit() {
  if (!selected.value) return
  draft.value = selected.value.label
  editingLabel.value = true
  nextTick(() => {
    const el = labelInput.value
    if (!el) return
    el.focus()
    const len = el.value.length
    el.setSelectionRange(len, len)
  })
}

function commitLabel() {
  if (!selected.value) return
  const v = draft.value.trim()
  if (v) G.setLabel(selected.value.id, v)
  editingLabel.value = false
}

function onLabelKey(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); commitLabel() }
  else if (e.key === 'Escape') { editingLabel.value = false }
}

function jumpTo(id: string) {
  G.selectedId = id; emit('centerOn', id)
}

function addChildHere() {
  if (!selected.value) return
  G.addChild(selected.value.id, 'new idea')
  nextTick(() => { if (G.selectedId) emit('startEdit', G.selectedId) })
}

function deleteHere() {
  if (isRoot.value) return
  G.deleteSubtree(G.selectedId ?? '')
}

function detachFromParent() {
  const id = G.selectedId
  const root = G.rootNode()
  if (!id || !root || id === root.id) return
  G.reparent(id, root.id)
}

function measureCard() {
  if (!cardEl.value) return
  const r = cardEl.value.getBoundingClientRect()
  cardSize.value = { w: r.width, h: r.height }
}

onMounted(() => { measureCard(); window.addEventListener('resize', measureCard) })
onBeforeUnmount(() => window.removeEventListener('resize', measureCard))
watch(selected, (node) => {
  sheetCollapsed.value = isMobileBreakpoint()
  if (!editingLabel.value) draft.value = node?.label ?? ''
})
watch([selected, children], () => nextTick(measureCard))

const cardPath = computed(() => {
  const w = cardSize.value.w, h = cardSize.value.h
  return `M 10 12 Q ${w/2} 6, ${w-10} 14 Q ${w-4} ${h/2}, ${w-12} ${h-12} Q ${w/2} ${h-4}, 8 ${h-14} Q 4 ${h/2}, 10 12 Z`
})
</script>
