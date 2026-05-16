<template>
  <aside class="side-note" v-if="selected">
    <div class="side-note-card" ref="cardEl">
      <svg class="side-note-card-bg" preserveAspectRatio="none" viewBox="0 0 268 320">
        <path :d="cardPath" filter="url(#wobble)"/>
      </svg>
      <div class="side-note-content">
        <div class="side-label-row">
          <input v-if="editingLabel"
                 ref="labelInput"
                 class="side-label"
                 v-model="draft"
                 @blur="commitLabel"
                 @keydown="onLabelKey"
                 maxlength="120"/>
          <div v-else class="side-label" @dblclick="startLabelEdit">{{ selected.label }}</div>
          <button class="side-pencil" @click="startLabelEdit" title="Edit label">✎</button>
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

        <div class="side-section">connects to:</div>
        <ul class="side-children">
          <li v-if="!children.length" class="empty">(nothing yet…)</li>
          <li v-for="c in children" :key="c.id" @click="jumpTo(c.id)">→ {{ c.label }}</li>
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
const draft = ref('')
const cardEl = ref<HTMLElement | null>(null)
const cardSize = ref({ w: 268, h: 320 })

const selected = computed(() => G.nodeById(G.selectedId ?? ''))
const ancestors = computed(() => G.ancestorsOf(G.selectedId ?? ''))
const children  = computed(() => G.childrenOf(G.selectedId ?? ''))
const isRoot    = computed(() => G.selectedId === G.rootNode()?.id)

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
  nextTick(() => { labelInput.value?.focus(); labelInput.value?.select() })
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

function measureCard() {
  if (!cardEl.value) return
  const r = cardEl.value.getBoundingClientRect()
  cardSize.value = { w: r.width, h: r.height }
}

onMounted(() => { measureCard(); window.addEventListener('resize', measureCard) })
onBeforeUnmount(() => window.removeEventListener('resize', measureCard))
watch([selected, children], () => nextTick(measureCard))

const cardPath = computed(() => {
  const w = cardSize.value.w, h = cardSize.value.h
  return `M 10 12 Q ${w/2} 6, ${w-10} 14 Q ${w-4} ${h/2}, ${w-12} ${h-12} Q ${w/2} ${h-4}, 8 ${h-14} Q 4 ${h/2}, 10 12 Z`
})
</script>
