<template>
  <div ref="canvasEl" :class="canvasClass"
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
        <g v-for="node in G.nodes" :key="node.id"
           :class="{ 'node-layouting': G.isLayouting }"
           :transform="`translate(${node.x} ${node.y}) rotate(${decorOf(node).rot})`">

          <!-- AI highlight ring -->
          <g v-if="G.highlightedIds.has(node.id)" filter="url(#wobble)">
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
          <g v-if="G.selectedId === node.id || G.linkFromId === node.id" filter="url(#wobble)">
            <path :d="decorOf(node).path0"
                  fill="none"
                  stroke="var(--accent)"
                  stroke-width="3.2"
                  :stroke-dasharray="G.linkFromId === node.id ? '6 4' : '0'"
                  :transform="`scale(${1 + 6 / decorOf(node).w})`"
                  opacity="0.55"/>
          </g>

          <!-- Node body -->
          <g filter="url(#wobble)" class="node-rect"
             @pointerdown="(e) => onNodePointerDown(e, node)"
             @dblclick="(e) => onNodeDblClick(e, node)">
            <path :d="decorOf(node).path0"
                  fill="var(--paper-card)"
                  :stroke="G.selectedId === node.id ? 'var(--accent)' : '#1f2533'"
                  :stroke-width="decorOf(node).level === 0 ? 2 : 1.6"
                  stroke-linejoin="round"/>
            <path :d="decorOf(node).path1"
                  fill="none"
                  :stroke="G.selectedId === node.id ? 'var(--accent)' : '#1f2533'"
                  :stroke-width="(decorOf(node).level === 0 ? 2 : 1.6) * 0.55"
                  stroke-linejoin="round" opacity="0.55"/>
          </g>

          <!-- Label (hidden while editing) -->
          <text v-if="G.editingId !== node.id"
                class="node-text"
                :class="{ selected: G.selectedId === node.id }"
                :font-size="decorOf(node).fontSize"
                :font-weight="decorOf(node).level === 0 ? 700 : 500">
            {{ node.label }}
          </text>

          <!-- Underline scribble for selected -->
          <g v-if="G.selectedId === node.id" filter="url(#wobble-soft)">
            <path :d="underlinePath(decorOf(node).w, decorOf(node).h)"
                  stroke="var(--accent)" stroke-width="2" fill="none" stroke-linecap="round"/>
          </g>
        </g>
      </g>
    </svg>

    <!-- Floating label editor (HTML over SVG) -->
    <input v-if="G.editingId"
           ref="editorEl"
           class="label-editor"
           :style="editorStyle"
           v-model="draftLabel"
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
import { useMindMapStore } from '~/stores/mindMapStore'
import type { MindMapNode } from '~/lib/ai/types'

const G = useMindMapStore()

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

onMounted(() => {
  updateVpSize()
  window.addEventListener('resize', updateVpSize)
  pan.value = {
    x: window.innerWidth / 2,
    y: Math.min(window.innerHeight / 2 + 60, window.innerHeight - 200),
  }
  requestAnimationFrame(() => fitView())
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateVpSize)
  window.removeEventListener('pointermove', onPanMove)
  window.removeEventListener('pointerup', onPanUp)
  window.removeEventListener('pointermove', onNodeMove)
  window.removeEventListener('pointerup', onNodeUp)
})

function worldToScreen(wx: number, wy: number) {
  return { x: wx * zoom.value + pan.value.x, y: wy * zoom.value + pan.value.y }
}
function screenToWorld(sx: number, sy: number) {
  return { x: (sx - pan.value.x) / zoom.value, y: (sy - pan.value.y) / zoom.value }
}
const transform = computed(() => `translate(${pan.value.x} ${pan.value.y}) scale(${zoom.value})`)

/* ---- geometry helpers ---- */
function rotFor(id: string): number {
  let h = 0
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) & 0xfffff
  return ((h % 9) - 4) * 0.7
}

// Approximate character width ratio for Kalam (handwriting font)
const CHAR_W = 0.52

function nodeSize(node: MindMapNode, level: number) {
  const label = node.label || ''
  const len = Math.max(1, label.length)
  if (level === 0) {
    // Root: let width grow for long labels, then fit font to width
    const w = Math.max(240, Math.min(400, Math.round(len * 14 + 60)))
    const fontSize = Math.min(42, Math.max(18, Math.floor((w - 40) / (len * CHAR_W))))
    return { w, h: 96, fontSize, radius: 30 }
  }
  if (level === 1) {
    const w = Math.max(160, Math.min(320, Math.round(len * 18 + 40)))
    const fontSize = Math.min(30, Math.max(14, Math.floor((w - 34) / (len * CHAR_W))))
    return { w, h: 60, fontSize, radius: 22 }
  }
  const w = Math.max(130, Math.min(280, Math.round(len * 14 + 34)))
  const fontSize = Math.min(22, Math.max(12, Math.floor((w - 28) / (len * CHAR_W))))
  return { w, h: 48, fontSize, radius: 18 }
}

function underlinePath(w: number, h: number): string {
  const seg = Math.round(Math.max(28, Math.min(48, (w - 20) / 4)))
  const x0 = -(seg * 4) / 2
  const y0 = h / 2 + 9
  return `M ${x0} ${y0} q ${seg * 0.5} -4 ${seg} 1 t ${seg} -1 t ${seg} 1 t ${seg} -1`
}

function sketchRectPath(x: number, y: number, w: number, h: number, r: number, j: number): string {
  return `M ${x+r+j} ${y-j}
          L ${x+w-r-j} ${y+j}
          Q ${x+w} ${y}, ${x+w+j} ${y+r-j}
          L ${x+w-j} ${y+h-r+j}
          Q ${x+w} ${y+h}, ${x+w-r+j} ${y+h+j}
          L ${x+r-j} ${y+h-j}
          Q ${x} ${y+h}, ${x-j} ${y+h-r+j}
          L ${x+j} ${y+r-j}
          Q ${x} ${y}, ${x+r-j} ${y+j} Z`
}

function edgePath(a: MindMapNode, b: MindMapNode, dir: number): string {
  const dx = b.x - a.x, dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len, ny = dx / len
  const s = dir
  return `M ${a.x} ${a.y} C ${a.x + dx * 0.35 + nx * 22 * s} ${a.y + dy * 0.35 + ny * 22 * s}, ${a.x + dx * 0.65 + nx * 20 * s} ${a.y + dy * 0.65 + ny * 20 * s}, ${b.x} ${b.y}`
}

/* ---- new edge set (for draw animation) ---- */
const newEdgeIds = ref(new Set<string>())
function markEdgeNew(id: string) {
  newEdgeIds.value.add(id)
  setTimeout(() => newEdgeIds.value.delete(id), 600)
}

const edges = computed(() => {
  const out: { id: string; d: string; active: boolean; isNew: boolean }[] = []
  let i = 0
  for (const n of G.nodes) {
    if (!n.parent) continue
    const p = G.nodeById(n.parent)
    if (!p) continue
    const id = `${p.id}->${n.id}`
    out.push({
      id,
      d: edgePath(p, n, (i % 2 === 0) ? 1 : -1),
      active: G.selectedId === n.id || G.selectedId === p.id ||
              G.editingId === n.id || G.editingId === p.id,
      isNew: newEdgeIds.value.has(id),
    })
    i++
  }
  return out
})

const crossLinkPaths = computed(() => {
  return G.crossLinks
    .map(cl => {
      const a = G.nodeById(cl.fromId)
      const b = G.nodeById(cl.toId)
      if (!a || !b) return null
      const id = cl.id
      return {
        id,
        d: edgePath(a, b, -1),
        active: G.selectedId === cl.fromId || G.selectedId === cl.toId,
        isNew: newEdgeIds.value.has(id),
      }
    })
    .filter(Boolean) as { id: string; d: string; active: boolean; isNew: boolean }[]
})

function decorOf(node: MindMapNode) {
  const lvl = G.levelOf(node.id)
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
  if (G.editingId) { commitLabelEditor(true); return }

  if (G.tool === 'add' && e.button === 0) {
    const w = screenToWorld(e.clientX, e.clientY)
    const parentId = G.selectedId ?? G.rootNode()?.id
    if (parentId) {
      const newId = G.addNodeAt(parentId, w.x, w.y, 'new idea')
      draftLabel.value = 'new idea'
      markEdgeNew(`${parentId}->${newId}`)
      nextTick(() => { editorEl.value?.focus(); editorEl.value?.select() })
    }
    return
  }

  if ((G.tool === 'branch' || G.tool === 'connect') && G.linkFromId) { G.linkFromId = null; return }

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
  if ((G.tool === 'branch' || G.tool === 'connect') && G.linkFromId) {
    cursorWorld.value = screenToWorld(e.clientX, e.clientY)
  } else if (cursorWorld.value) {
    cursorWorld.value = null
  }
}

/* ---- node drag ---- */
let dragInfo: { nodeId: string; startX: number; startY: number; origX: number; origY: number; moved: boolean } | null = null

function onNodePointerDown(e: PointerEvent, node: MindMapNode) {
  e.stopPropagation()
  if (G.editingId && G.editingId !== node.id) commitLabelEditor(true)

  if (G.tool === 'erase') { G.deleteSubtree(node.id); return }

  if (G.tool === 'branch') {
    if (!G.linkFromId) {
      G.linkFromId = node.id; G.selectedId = node.id
    } else if (G.linkFromId !== node.id) {
      const fromId = G.linkFromId
      G.reparent(node.id, fromId)
      markEdgeNew(`${fromId}->${node.id}`)
      G.linkFromId = null; G.selectedId = node.id
    } else {
      G.linkFromId = null
    }
    return
  }

  if (G.tool === 'connect') {
    if (!G.linkFromId) {
      G.linkFromId = node.id; G.selectedId = node.id
    } else if (G.linkFromId !== node.id) {
      G.addCrossLink(G.linkFromId, node.id)
      G.linkFromId = null; G.selectedId = node.id
    } else {
      G.linkFromId = null
    }
    return
  }

  G.selectedId = node.id
  dragInfo = { nodeId: node.id, startX: e.clientX, startY: e.clientY, origX: node.x, origY: node.y, moved: false }
  window.addEventListener('pointermove', onNodeMove)
  window.addEventListener('pointerup', onNodeUp)
}

function onNodeMove(e: PointerEvent) {
  if (!dragInfo) return
  const dx = (e.clientX - dragInfo.startX) / zoom.value
  const dy = (e.clientY - dragInfo.startY) / zoom.value
  if (!dragInfo.moved && Math.hypot(dx * zoom.value, dy * zoom.value) > 3) {
    dragInfo.moved = true; G.beginDrag()
  }
  if (dragInfo.moved) G.moveNode(dragInfo.nodeId, dragInfo.origX + dx, dragInfo.origY + dy)
}

function onNodeUp() {
  if (!dragInfo) return
  G.endDrag(dragInfo.moved); dragInfo = null
  window.removeEventListener('pointermove', onNodeMove)
  window.removeEventListener('pointerup', onNodeUp)
}

function onNodeDblClick(e: MouseEvent, node: MindMapNode) {
  e.stopPropagation(); startEdit(node)
}

function startEdit(node: MindMapNode) {
  G.selectedId = node.id; G.editingId = node.id
  draftLabel.value = node.label
  nextTick(() => { editorEl.value?.focus(); editorEl.value?.select() })
}

function commitLabelEditor(save: boolean) {
  const id = G.editingId
  if (!id) return
  if (save) { const v = draftLabel.value.trim(); if (v) G.setLabel(id, v) }
  G.editingId = null; draftLabel.value = ''
}

function onEditorKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitLabelEditor(true) }
  else if (e.key === 'Escape') { e.preventDefault(); commitLabelEditor(false) }
}

const editorStyle = computed(() => {
  const id = G.editingId
  if (!id) return null
  const n = G.nodeById(id)
  if (!n) return null
  const s = worldToScreen(n.x, n.y)
  const lvl = G.levelOf(id)
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
  'add-mode': G.tool === 'add',
  'link-mode': G.tool === 'branch',
  'connect-mode': G.tool === 'connect',
  'erase-mode': G.tool === 'erase',
}))

const linkPreview = computed(() => {
  if ((G.tool !== 'branch' && G.tool !== 'connect') || !G.linkFromId || !cursorWorld.value) return null
  const a = G.nodeById(G.linkFromId)
  if (!a) return null
  return { x1: a.x, y1: a.y, x2: cursorWorld.value.x, y2: cursorWorld.value.y, dashed: G.tool === 'connect' }
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
  const ns = G.nodes
  if (!ns.length) return
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const n of ns) {
    const sz = nodeSize(n, G.levelOf(n.id))
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
  const n = G.nodeById(id)
  if (!n) return
  pan.value = { x: window.innerWidth / 2 - n.x * zoom.value, y: window.innerHeight / 2 - n.y * zoom.value }
}

const zoomPct = computed(() => Math.round(zoom.value * 100))

async function exportPNG(): Promise<void> {
  const svgEl = canvasEl.value?.querySelector('svg')
  if (!svgEl) return

  const w = svgEl.clientWidth || window.innerWidth
  const h = svgEl.clientHeight || window.innerHeight

  // Resolve CSS custom properties up front
  const rootStyle = getComputedStyle(document.documentElement)
  const cssVars: Record<string, string> = {}
  for (const prop of ['--paper-card', '--ink', '--ink-soft', '--accent', '--accent-soft', '--muted']) {
    cssVars[prop] = rootStyle.getPropertyValue(prop).trim()
  }
  const ink = cssVars['--ink'] || '#1f2533'
  const accent = cssVars['--accent'] || '#c4604a'

  const clone = svgEl.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))

  // Inline .node-text class attributes — CSS classes aren't available in blob scope
  for (const el of clone.querySelectorAll('text.node-text')) {
    el.setAttribute('text-anchor', 'middle')
    el.setAttribute('dominant-baseline', 'middle')
    el.setAttribute('font-family', 'Caveat, cursive')
    el.setAttribute('fill', el.classList.contains('selected') ? accent : ink)
    el.removeAttribute('class')
  }

  // Add paper background
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%')
  bg.setAttribute('fill', cssVars['--paper-card'] || '#fdfaf2')
  clone.insertBefore(bg, clone.firstChild)

  // Fetch @font-face URLs and embed as base64 so fonts render in the blob context
  const fontRules = Array.from(document.styleSheets)
    .flatMap(s => { try { return Array.from(s.cssRules) } catch { return [] } })
    .filter(r => r instanceof CSSFontFaceRule)
    .map(r => r.cssText)

  const embeddedFonts: string[] = []
  for (const rule of fontRules) {
    const m = rule.match(/url\(["']?(https?:[^"')]+)["']?\)/)
    if (!m) { embeddedFonts.push(rule); continue }
    try {
      const buf = await fetch(m[1]).then(r => r.arrayBuffer())
      let binary = ''
      const bytes = new Uint8Array(buf)
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      const b64 = btoa(binary)
      const mime = m[1].includes('woff2') ? 'font/woff2' : 'font/woff'
      embeddedFonts.push(rule.replace(m[0], `url(data:${mime};base64,${b64})`))
    } catch {
      embeddedFonts.push(rule)
    }
  }

  const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  styleEl.textContent = embeddedFonts.join('\n')
  clone.insertBefore(styleEl, clone.firstChild)

  // Resolve remaining CSS variable references in attributes
  let svgStr = new XMLSerializer().serializeToString(clone)
  svgStr = svgStr.replace(/var\(\s*(--[a-z-]+)\s*\)/g, (_, name) => cssVars[name] ?? '#000')

  const blob = new Blob([svgStr], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)

  await new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = w * 2; canvas.height = h * 2
      const ctx = canvas.getContext('2d')!
      ctx.scale(2, 2)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      canvas.toBlob(pngBlob => {
        if (!pngBlob) { reject(new Error('PNG export failed')); return }
        const a = document.createElement('a')
        const safeTitle = (G.title || 'mindmap').replace(/[^a-z0-9_\-]+/gi, '_')
        a.href = URL.createObjectURL(pngBlob)
        a.download = `${safeTitle}.png`
        document.body.appendChild(a); a.click(); a.remove()
        URL.revokeObjectURL(a.href)
        resolve()
      }, 'image/png')
    }
    img.onerror = reject
    img.src = url
  })
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
