<template>
  <div ref="canvasEl" :class="canvasClass"
       role="application"
       aria-label="Mind map canvas — drag to pan, scroll to zoom, double-click a node to rename"
       @wheel.prevent="onWheel"
       @pointerdown="onCanvasPointerDown"
       @pointermove="onCanvasPointerMove">
    <svg xmlns="http://www.w3.org/2000/svg"
         :viewBox="`0 0 ${vpSize.w} ${vpSize.h}`"
         preserveAspectRatio="xMidYMid slice">
      <defs>
        <filter id="wobble" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="4" result="t"/>
          <feDisplacementMap in="SourceGraphic" in2="t" scale="2.4"/>
        </filter>
        <filter id="wobble-soft" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="7" result="t"/>
          <feDisplacementMap in="SourceGraphic" in2="t" scale="1.6"/>
        </filter>
      </defs>

      <g :transform="transform">
        <!-- Edges -->
        <g class="edges">
          <g v-for="edge in edges" :key="edge.id" filter="url(#wobble-soft)">
            <!-- shadow stroke -->
            <path :d="edge.d" stroke="#1f2533" stroke-width="0.8"
                  fill="none" stroke-linecap="round"
                  :opacity="edge.active ? 0.45 : 0.22"
                  transform="translate(1.2 1.6)"/>
            <!-- primary stroke -->
            <path :d="edge.d"
                  :stroke="edge.active ? 'var(--accent)' : '#1f2533'"
                  :stroke-width="edge.active ? 2.4 : 1.5"
                  fill="none" stroke-linecap="round"
                  :opacity="edge.active ? 1 : 0.62"
                  :class="{ 'edge-new': edge.isNew }"/>
          </g>
        </g>

        <!-- Cross-links (AI-suggested associations) -->
        <g v-for="cl in crossLinkPaths" :key="cl.id" filter="url(#wobble-soft)">
          <path :d="cl.d" fill="none" stroke="#1f2533" stroke-width="0.8"
                stroke-dasharray="7 5" stroke-linecap="round" opacity="0.18"
                transform="translate(1.2 1.6)"/>
          <path :d="cl.d" fill="none" :stroke="cl.active ? 'var(--accent)' : '#1f2533'"
                :stroke-width="cl.active ? 2.2 : 1.4"
                stroke-dasharray="7 5" stroke-linecap="round"
                :opacity="cl.active ? 1 : 0.5"
                :class="{ 'edge-new': cl.isNew }"/>
        </g>

        <!-- Link-preview line -->
        <g v-if="linkPreview" filter="url(#wobble-soft)">
          <line :x1="linkPreview.x1" :y1="linkPreview.y1"
                :x2="linkPreview.x2" :y2="linkPreview.y2"
                stroke="var(--accent)" stroke-width="2"
                :stroke-dasharray="linkPreview.dashed ? '6 5' : '0'"
                stroke-linecap="round"/>
        </g>

        <!-- Nodes -->
        <g v-for="node in graph.nodes" :key="node.id"
           :class="{ 'node-layouting': graph.isLayouting }"
           :transform="`translate(${node.x} ${node.y}) rotate(${decorOf(node).rot})`">

          <!-- AI highlight ring -->
          <g v-if="ai.highlightedIds.has(node.id)" filter="url(#wobble)">
            <path :d="decorOf(node).path0"
                  fill="none"
                  stroke="var(--accent)"
                  stroke-width="3.5"
                  stroke-dasharray="5 3"
                  :transform="`scale(${1 + 10 / decorOf(node).w})`"
                  opacity="0.7">
              <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.2s" repeatCount="indefinite"/>
            </path>
          </g>

          <!-- Selection halo -->
          <g v-if="graph.selectedId === node.id || graph.linkFromId === node.id" filter="url(#wobble)">
            <path :d="decorOf(node).path0"
                  fill="none"
                  stroke="var(--accent)"
                  stroke-width="3.2"
                  :stroke-dasharray="graph.linkFromId === node.id ? '6 4' : '0'"
                  :transform="`scale(${1 + 6 / decorOf(node).w})`"
                  opacity="0.55"/>
          </g>

          <!-- Node body -->
          <g filter="url(#wobble)" class="node-rect"
             role="button"
             :aria-label="node.label"
             tabindex="0"
             @pointerdown="(e) => onNodePointerDown(e, node)"
             @dblclick="(e) => onNodeDblClick(e, node)"
             @keydown.enter="(e) => { graph.selectedId = node.id; startEdit(node) }"
             @keydown.delete="() => graph.deleteSubtree(node.id)">
            <path :d="decorOf(node).path0"
                  fill="var(--paper-card)"
                  :stroke="graph.selectedId === node.id ? 'var(--accent)' : '#1f2533'"
                  :stroke-width="decorOf(node).level === 0 ? 2 : 1.6"
                  stroke-linejoin="round"/>
            <path :d="decorOf(node).path1"
                  fill="none"
                  :stroke="graph.selectedId === node.id ? 'var(--accent)' : '#1f2533'"
                  :stroke-width="(decorOf(node).level === 0 ? 2 : 1.6) * 0.55"
                  stroke-linejoin="round" opacity="0.55"/>
          </g>

          <!-- Label (hidden while editing) -->
          <text v-if="graph.editingId !== node.id"
                class="node-text"
                :class="{ selected: graph.selectedId === node.id }"
                :font-size="decorOf(node).fontSize"
                :font-weight="decorOf(node).level === 0 ? 700 : 500">
            {{ node.label }}
          </text>

          <!-- Underline scribble for selected -->
          <g v-if="graph.selectedId === node.id" filter="url(#wobble-soft)">
            <path :d="underlinePath(decorOf(node).w, decorOf(node).h)"
                  stroke="var(--accent)" stroke-width="2" fill="none" stroke-linecap="round"/>
          </g>
        </g>
      </g>
    </svg>

    <!-- Floating label editor (HTML over SVG) -->
    <input v-if="graph.editingId"
           ref="editorEl"
           class="label-editor"
           :style="editorStyle"
           v-model="draftLabel"
           aria-label="Edit node label"
           @keydown="onEditorKey"
           @blur="commitLabelEditor(true)"
           @pointerdown.stop
           @click.stop
           @wheel.stop
           maxlength="120"/>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useTouchGestures } from '~/composables/useTouchGestures'
import { nodeSize, rotFor, sketchRectPath, underlinePath, edgePath } from '~/lib/mindmap/geometry'
import { exportPng } from '~/lib/mindmap/exportPng'
import type { MindMapNode } from '~/lib/ai/types'

const graph = useGraphStore()
const ai = useAIStore()

const canvasEl = ref<HTMLElement | null>(null)
const editorEl = ref<HTMLInputElement | null>(null)
const pan      = ref({ x: 0, y: 0 })
const zoom     = ref(1)
const draftLabel = ref('')
const panning  = ref(false)
const cursorWorld = ref<{ x: number; y: number } | null>(null)
const vpSize   = ref({ w: 1280, h: 800 })

function updateVpSize() {
  vpSize.value = { w: window.innerWidth, h: window.innerHeight }
}

function onLongPressOnCanvas(clientX: number, clientY: number) {
  const w = screenToWorld(clientX, clientY)
  // Find node near the long-press point (within 80px world units)
  const hit = graph.nodes.find(n => Math.hypot(n.x - w.x, n.y - w.y) < 80)
  if (hit) {
    graph.selectedId = hit.id
    startEdit(hit)
  }
}

const touchGestures = useTouchGestures(
  canvasEl,
  { pan, zoom },
  onLongPressOnCanvas,
)

onMounted(() => {
  updateVpSize()
  window.addEventListener('resize', updateVpSize)
  pan.value = {
    x: window.innerWidth / 2,
    y: Math.min(window.innerHeight / 2 + 60, window.innerHeight - 200),
  }
  requestAnimationFrame(() => fitView())
  touchGestures.attach()
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateVpSize)
  window.removeEventListener('pointermove', onPanMove)
  window.removeEventListener('pointerup', onPanUp)
  window.removeEventListener('pointermove', onNodeMove)
  window.removeEventListener('pointerup', onNodeUp)
  touchGestures.detach()
})

function worldToScreen(wx: number, wy: number) {
  return { x: wx * zoom.value + pan.value.x, y: wy * zoom.value + pan.value.y }
}
function screenToWorld(sx: number, sy: number) {
  return { x: (sx - pan.value.x) / zoom.value, y: (sy - pan.value.y) / zoom.value }
}
const transform = computed(() => `translate(${pan.value.x} ${pan.value.y}) scale(${zoom.value})`)

/* ---- geometry helpers (imported from lib/mindmap/geometry.ts) ---- */

/* ---- new edge set (for draw animation) ---- */
const newEdgeIds = ref(new Set<string>())
function markEdgeNew(id: string) {
  newEdgeIds.value.add(id)
  setTimeout(() => newEdgeIds.value.delete(id), 600)
}

const edges = computed(() => {
  const out: { id: string; d: string; active: boolean; isNew: boolean }[] = []
  let i = 0
  for (const n of graph.nodes) {
    if (!n.parent) continue
    const p = graph.nodeById(n.parent)
    if (!p) continue
    const id = `${p.id}->${n.id}`
    out.push({
      id,
      d: edgePath(p, n, (i % 2 === 0) ? 1 : -1),
      active: graph.selectedId === n.id || graph.selectedId === p.id ||
              graph.editingId === n.id || graph.editingId === p.id,
      isNew: newEdgeIds.value.has(id),
    })
    i++
  }
  return out
})

const crossLinkPaths = computed(() => {
  return graph.crossLinks
    .map(cl => {
      const a = graph.nodeById(cl.fromId)
      const b = graph.nodeById(cl.toId)
      if (!a || !b) return null
      const id = cl.id
      return {
        id,
        d: edgePath(a, b, -1),
        active: graph.selectedId === cl.fromId || graph.selectedId === cl.toId,
        isNew: newEdgeIds.value.has(id),
      }
    })
    .filter(Boolean) as { id: string; d: string; active: boolean; isNew: boolean }[]
})

function decorOf(node: MindMapNode) {
  const lvl = graph.levelOf(node.id)
  const { w, h, fontSize, radius } = nodeSize(node, lvl)
  const x = -w / 2, y = -h / 2
  return {
    w, h, fontSize, radius, x, y,
    path0: sketchRectPath(x, y, w, h, radius, 0),
    path1: sketchRectPath(x, y, w, h, radius, 1.2),
    rot: rotFor(node.id),
    level: lvl,
  }
}

/* ---- wheel: pan or zoom ---- */
function onWheel(e: WheelEvent) {
  e.preventDefault()
  if (e.ctrlKey || e.metaKey) {
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    const next = Math.max(0.3, Math.min(2.6, zoom.value * factor))
    const wx = (e.clientX - pan.value.x) / zoom.value
    const wy = (e.clientY - pan.value.y) / zoom.value
    zoom.value = next
    pan.value = { x: e.clientX - wx * next, y: e.clientY - wy * next }
  } else {
    pan.value = { x: pan.value.x - e.deltaX, y: pan.value.y - e.deltaY }
  }
}

/* ---- canvas pan ---- */
let panStart: { x: number; y: number; px: number; py: number; moved: boolean } | null = null

function onCanvasPointerDown(e: PointerEvent) {
  if (e.button !== 0 && e.button !== 1) return
  if (graph.editingId) { commitLabelEditor(true); return }

  if (graph.tool === 'add' && e.button === 0) {
    const w = screenToWorld(e.clientX, e.clientY)
    const parentId = graph.selectedId ?? graph.rootNode()?.id
    if (parentId) {
      const newId = graph.addNodeAt(parentId, w.x, w.y, 'new idea')
      draftLabel.value = 'new idea'
      markEdgeNew(`${parentId}->${newId}`)
      nextTick(() => { editorEl.value?.focus(); editorEl.value?.select() })
    }
    return
  }

  if ((graph.tool === 'branch' || graph.tool === 'connect') && graph.linkFromId) { graph.linkFromId = null; return }

  panStart = { x: e.clientX, y: e.clientY, px: pan.value.x, py: pan.value.y, moved: false }
  panning.value = true
  window.addEventListener('pointermove', onPanMove)
  window.addEventListener('pointerup', onPanUp)
}

function onPanMove(e: PointerEvent) {
  if (!panStart) return
  const dx = e.clientX - panStart.x, dy = e.clientY - panStart.y
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) panStart.moved = true
  pan.value = { x: panStart.px + dx, y: panStart.py + dy }
}

function onPanUp() {
  panStart = null; panning.value = false
  window.removeEventListener('pointermove', onPanMove)
  window.removeEventListener('pointerup', onPanUp)
}

function onCanvasPointerMove(e: PointerEvent) {
  if ((graph.tool === 'branch' || graph.tool === 'connect') && graph.linkFromId) {
    cursorWorld.value = screenToWorld(e.clientX, e.clientY)
  } else if (cursorWorld.value) {
    cursorWorld.value = null
  }
}

/* ---- node drag ---- */
let dragInfo: { nodeId: string; startX: number; startY: number; origX: number; origY: number; moved: boolean } | null = null

function onNodePointerDown(e: PointerEvent, node: MindMapNode) {
  e.stopPropagation()
  if (graph.editingId && graph.editingId !== node.id) commitLabelEditor(true)

  if (graph.tool === 'erase') { graph.deleteSubtree(node.id); return }

  if (graph.tool === 'branch') {
    if (!graph.linkFromId) {
      graph.linkFromId = node.id; graph.selectedId = node.id
    } else if (graph.linkFromId !== node.id) {
      const fromId = graph.linkFromId
      graph.reparent(node.id, fromId)
      markEdgeNew(`${fromId}->${node.id}`)
      graph.linkFromId = null; graph.selectedId = node.id
    } else {
      graph.linkFromId = null
    }
    return
  }

  if (graph.tool === 'connect') {
    if (!graph.linkFromId) {
      graph.linkFromId = node.id; graph.selectedId = node.id
    } else if (graph.linkFromId !== node.id) {
      graph.addCrossLink(graph.linkFromId, node.id)
      graph.linkFromId = null; graph.selectedId = node.id
    } else {
      graph.linkFromId = null
    }
    return
  }

  graph.selectedId = node.id
  dragInfo = { nodeId: node.id, startX: e.clientX, startY: e.clientY, origX: node.x, origY: node.y, moved: false }
  window.addEventListener('pointermove', onNodeMove)
  window.addEventListener('pointerup', onNodeUp)
}

function onNodeMove(e: PointerEvent) {
  if (!dragInfo) return
  const dx = (e.clientX - dragInfo.startX) / zoom.value
  const dy = (e.clientY - dragInfo.startY) / zoom.value
  if (!dragInfo.moved && Math.hypot(dx * zoom.value, dy * zoom.value) > 3) {
    dragInfo.moved = true; graph.beginDrag()
  }
  if (dragInfo.moved) graph.moveNode(dragInfo.nodeId, dragInfo.origX + dx, dragInfo.origY + dy)
}

function onNodeUp() {
  if (!dragInfo) return
  graph.endDrag(dragInfo.moved); dragInfo = null
  window.removeEventListener('pointermove', onNodeMove)
  window.removeEventListener('pointerup', onNodeUp)
}

function onNodeDblClick(e: MouseEvent, node: MindMapNode) {
  e.stopPropagation(); startEdit(node)
}

function startEdit(node: MindMapNode) {
  graph.selectedId = node.id; graph.editingId = node.id
  draftLabel.value = node.label
  nextTick(() => { editorEl.value?.focus(); editorEl.value?.select() })
}

function commitLabelEditor(save: boolean) {
  const id = graph.editingId
  if (!id) return
  if (save) { const v = draftLabel.value.trim(); if (v) graph.setLabel(id, v) }
  graph.editingId = null; draftLabel.value = ''
}

function onEditorKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitLabelEditor(true) }
  else if (e.key === 'Escape') { e.preventDefault(); commitLabelEditor(false) }
}

const editorStyle = computed(() => {
  const id = graph.editingId
  if (!id) return null
  const n = graph.nodeById(id)
  if (!n) return null
  const s = worldToScreen(n.x, n.y)
  const lvl = graph.levelOf(id)
  const sz = nodeSize(n, lvl)
  return {
    left: s.x + 'px',
    top: s.y + 'px',
    minWidth: Math.max(100, sz.w * zoom.value - 16) + 'px',
    fontSize: Math.max(14, sz.fontSize * zoom.value) + 'px',
  }
})

const canvasClass = computed(() => ({
  canvas: true,
  panning: panning.value,
  'add-mode': graph.tool === 'add',
  'link-mode': graph.tool === 'branch',
  'connect-mode': graph.tool === 'connect',
  'erase-mode': graph.tool === 'erase',
}))

const linkPreview = computed(() => {
  if ((graph.tool !== 'branch' && graph.tool !== 'connect') || !graph.linkFromId || !cursorWorld.value) return null
  const a = graph.nodeById(graph.linkFromId)
  if (!a) return null
  return { x1: a.x, y1: a.y, x2: cursorWorld.value.x, y2: cursorWorld.value.y, dashed: graph.tool === 'connect' }
})

/* ---- imperative API (exposed to parent) ---- */
function zoomIn()  { setZoomAtCenter(zoom.value * 1.2) }
function zoomOut() { setZoomAtCenter(zoom.value / 1.2) }

function setZoomAtCenter(targetZoom: number) {
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2
  const next = Math.max(0.3, Math.min(2.6, targetZoom))
  const wx = (cx - pan.value.x) / zoom.value
  const wy = (cy - pan.value.y) / zoom.value
  zoom.value = next
  pan.value = { x: cx - wx * next, y: cy - wy * next }
}

function fitView() {
  const ns = graph.nodes
  if (!ns.length) return
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const n of ns) {
    const sz = nodeSize(n, graph.levelOf(n.id))
    minX = Math.min(minX, n.x - sz.w / 2); maxX = Math.max(maxX, n.x + sz.w / 2)
    minY = Math.min(minY, n.y - sz.h / 2); maxY = Math.max(maxY, n.y + sz.h / 2)
  }
  const margin = 60
  const W = maxX - minX + margin * 2, H = maxY - minY + margin * 2
  const isNarrow     = window.innerWidth < 800
  const sideNoteOpen = window.innerWidth >= 1100
  const topReserve    = isNarrow ? 150 : 170
  const bottomReserve = isNarrow ? 110 : 70
  const rightReserve  = sideNoteOpen ? 320 : 24
  const leftReserve   = 24
  const availW = Math.max(200, window.innerWidth  - leftReserve - rightReserve)
  const availH = Math.max(200, window.innerHeight - topReserve  - bottomReserve)
  zoom.value = Math.max(0.45, Math.min(1.3, Math.min(availW / W, availH / H)))
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
  pan.value = { x: leftReserve + availW / 2 - cx * zoom.value, y: topReserve + availH / 2 - cy * zoom.value }
}

function centerOn(id: string) {
  const n = graph.nodeById(id)
  if (!n) return
  pan.value = { x: window.innerWidth / 2 - n.x * zoom.value, y: window.innerHeight / 2 - n.y * zoom.value }
}

const zoomPct = computed(() => Math.round(zoom.value * 100))

async function exportPNG(): Promise<void> {
  const svgEl = canvasEl.value?.querySelector('svg')
  if (!svgEl) return
  await exportPng(svgEl, graph.title || 'mindmap')
}

defineExpose({ zoomIn, zoomOut, fitView, centerOn, startEdit, zoom, zoomPct, exportPNG })
</script>

<style scoped>
.node-layouting {
  transition: transform 0.55s cubic-bezier(0.34, 1.2, 0.64, 1);
}
.edge-new {
  stroke-dasharray: 300;
  stroke-dashoffset: 300;
  animation: draw-edge 0.5s ease forwards;
}
@keyframes draw-edge {
  to { stroke-dashoffset: 0; }
}
</style>
