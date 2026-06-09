<template>
  <div ref="canvasEl" :class="canvasClass"
       role="application"
       aria-label="Mind map canvas — drag to pan, scroll to zoom, double-click a node to rename"
       @wheel.prevent="onWheel"
       @pointerdown="onCanvasPointerDown"
       @pointermove="onCanvasPointerMove">
    <svg xmlns="http://www.w3.org/2000/svg"
         :viewBox="`0 0 ${viewportSize.w} ${viewportSize.h}`"
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
        <CanvasNode
          v-for="node in graph.nodes"
          :key="node.id"
          :node="node"
          :decor="decorOf(node)"
          :is-selected="graph.selectedId === node.id"
          :is-link-source="graph.linkFromId === node.id"
          :is-highlighted="ai.highlightedIds.has(node.id)"
          :is-editing="graph.editingId === node.id"
          :is-layouting="graph.isLayouting"
          @pointerdown="(e) => onNodePointerDown(e, node)"
          @dblclick="(e) => onNodeDblClick(e, node)"
          @edit="startEdit(node)"
          @delete="graph.deleteSubtree(node.id)"
        />
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
import { useViewport } from '~/composables/useViewport'
import { useNodeDrag } from '~/composables/useNodeDrag'
import { useLabelEditor } from '~/composables/useLabelEditor'
import { nodeSize, rotFor, sketchRectPath, edgePath, SKETCH_JITTER } from '~/lib/mindmap/geometry'
import { exportPng } from '~/lib/mindmap/exportPng'
import { TOOL } from '~/lib/mindmap/constants'
import { VIEWPORT } from '~/lib/config'
import type { MindMapNode } from '~/lib/ai/types'

const graph = useGraphStore()
const ai = useAIStore()

const canvasEl = ref<HTMLElement | null>(null)
const editorEl = ref<HTMLInputElement | null>(null)
const panning  = ref(false)
const cursorWorld = ref<{ x: number; y: number } | null>(null)
const viewportSize = ref<{ w: number; h: number }>({ ...VIEWPORT.DEFAULT_SIZE })

function updateViewportSize() {
  viewportSize.value = { w: window.innerWidth, h: window.innerHeight }
}

/* ---- viewport: pan / zoom / fit (composable owns pan+zoom refs) ---- */
const viewport = useViewport(viewportSize)
const { pan, zoom, transform, zoomPct, worldToScreen, screenToWorld, onWheel, zoomIn, zoomOut } = viewport
function fitView()       { viewport.fitView(graph.nodes, id => graph.levelOf(id)) }
function centerOn(id: string) { const n = graph.nodeById(id); if (n) viewport.centerOn(n) }

/* ---- label editor (HTML input floating over SVG) ---- */
const labelEditor = useLabelEditor(zoom, worldToScreen, editorEl, {
  getEditingId: () => graph.editingId,
  setEditingId: (id) => { graph.editingId = id },
  setLabel:     (id, label) => graph.setLabel(id, label),
  nodeById:     (id) => graph.nodeById(id) ?? undefined,
  levelOf:      (id) => graph.levelOf(id),
})

const { draftLabel, commitLabelEditor, onEditorKey, editorStyle } = labelEditor
// Canvas selection follows the edited node; wrap the composable's startEdit.
function startEdit(node: MindMapNode) { graph.selectedId = node.id; labelEditor.startEdit(node) }

/* ---- node drag ---- */
const nodeDrag = useNodeDrag(zoom, {
  beginDrag: () => graph.beginDrag(),
  moveNode:  (id, x, y) => graph.moveNode(id, x, y),
  endDrag:   (moved) => graph.endDrag(moved),
  addNodeAt: (p, x, y, l) => graph.addNodeAt(p, x, y, l),
})

function onLongPressOnCanvas(clientX: number, clientY: number) {
  const world = screenToWorld(clientX, clientY)
  // Find node near the long-press point (within 80px world units)
  const hit = graph.nodes.find(n => Math.hypot(n.x - world.x, n.y - world.y) < 80)
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
  updateViewportSize()
  window.addEventListener('resize', updateViewportSize)
  pan.value = {
    x: window.innerWidth / 2,
    y: Math.min(
      window.innerHeight / 2 + VIEWPORT.INITIAL_PAN_TOP_OFFSET,
      window.innerHeight - VIEWPORT.INITIAL_PAN_BOTTOM_MARGIN,
    ),
  }
  requestAnimationFrame(() => fitView())
  touchGestures.attach()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportSize)
  window.removeEventListener('pointermove', onPanMove)
  window.removeEventListener('pointerup', onPanUp)
  nodeDrag.cleanup()
  touchGestures.detach()
})

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
    path1: sketchRectPath(x, y, w, h, radius, SKETCH_JITTER),
    rot: rotFor(node.id),
    level: lvl,
  }
}

/* ---- canvas pan ---- */
let panStart: { x: number; y: number; px: number; py: number; moved: boolean } | null = null

function onCanvasPointerDown(e: PointerEvent) {
  if (e.button !== 0 && e.button !== 1) return
  if (graph.editingId) { commitLabelEditor(true); return }

  if (graph.tool === TOOL.add && e.button === 0) {
    const world = screenToWorld(e.clientX, e.clientY)
    const parentId = graph.selectedId ?? graph.rootNode()?.id

    if (parentId) {
      const newId = graph.addNodeAt(parentId, world.x, world.y, 'new idea')
      draftLabel.value = 'new idea'
      markEdgeNew(`${parentId}->${newId}`)
      nextTick(() => { editorEl.value?.focus(); editorEl.value?.select() })
    }
    return
  }

  if ((graph.tool === TOOL.branch || graph.tool === TOOL.connect) && graph.linkFromId) { graph.linkFromId = null; return }

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
  if ((graph.tool === TOOL.branch || graph.tool === TOOL.connect) && graph.linkFromId) {
    cursorWorld.value = screenToWorld(e.clientX, e.clientY)
  } else if (cursorWorld.value) {
    cursorWorld.value = null
  }
}

function onNodePointerDown(e: PointerEvent, node: MindMapNode) {
  e.stopPropagation()
  if (graph.editingId && graph.editingId !== node.id) commitLabelEditor(true)

  if (graph.tool === TOOL.erase) { graph.deleteSubtree(node.id); return }

  if (graph.tool === TOOL.branch) {
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

  if (graph.tool === TOOL.connect) {
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
  nodeDrag.onNodeDragStart(e, node)
}

function onNodeDblClick(e: MouseEvent, node: MindMapNode) {
  e.stopPropagation(); startEdit(node)
}

const canvasClass = computed(() => ({
  canvas: true,
  panning: panning.value,
  'add-mode': graph.tool === TOOL.add,
  'link-mode': graph.tool === TOOL.branch,
  'connect-mode': graph.tool === TOOL.connect,
  'erase-mode': graph.tool === TOOL.erase,
}))

const linkPreview = computed(() => {
  if ((graph.tool !== TOOL.branch && graph.tool !== TOOL.connect) || !graph.linkFromId || !cursorWorld.value) return null
  const a = graph.nodeById(graph.linkFromId)
  if (!a) return null
  return { x1: a.x, y1: a.y, x2: cursorWorld.value.x, y2: cursorWorld.value.y, dashed: graph.tool === TOOL.connect }
})

/* ---- imperative API (exposed to parent); pan/zoom/fit live in useViewport ---- */
async function exportPNG(): Promise<void> {
  const svgEl = canvasEl.value?.querySelector('svg')
  if (!svgEl) return
  await exportPng(svgEl, graph.title || 'mindmap')
}

defineExpose({ zoomIn, zoomOut, fitView, centerOn, startEdit, zoom, zoomPct, exportPNG })
</script>

<style scoped>
.edge-new {
  stroke-dasharray: 300;
  stroke-dashoffset: 300;
  animation: draw-edge 0.5s ease forwards;
}
@keyframes draw-edge {
  to { stroke-dashoffset: 0; }
}
</style>
