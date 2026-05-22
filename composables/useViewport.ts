import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import { nodeSize } from '~/lib/mindmap/geometry'
import type { MindMapNode } from '~/lib/ai/types'

const ZOOM_MIN = 0.3
const ZOOM_MAX = 2.6

export function useViewport(vpSize: Ref<{ w: number; h: number }>) {
  const pan  = ref({ x: 0, y: 0 })
  const zoom = ref(1)

  const transform = computed(() => `translate(${pan.value.x} ${pan.value.y}) scale(${zoom.value})`)
  const zoomPct   = computed(() => Math.round(zoom.value * 100))

  function worldToScreen(wx: number, wy: number) {
    return { x: wx * zoom.value + pan.value.x, y: wy * zoom.value + pan.value.y }
  }

  function screenToWorld(sx: number, sy: number) {
    return { x: (sx - pan.value.x) / zoom.value, y: (sy - pan.value.y) / zoom.value }
  }

  function setZoomAtCenter(targetZoom: number) {
    const cx = vpSize.value.w / 2, cy = vpSize.value.h / 2
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, targetZoom))
    const wx = (cx - pan.value.x) / zoom.value
    const wy = (cy - pan.value.y) / zoom.value
    zoom.value = next
    pan.value  = { x: cx - wx * next, y: cy - wy * next }
  }

  function zoomIn()  { setZoomAtCenter(zoom.value * 1.2) }
  function zoomOut() { setZoomAtCenter(zoom.value / 1.2) }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom.value * factor))
      const wx = (e.clientX - pan.value.x) / zoom.value
      const wy = (e.clientY - pan.value.y) / zoom.value
      zoom.value = next
      pan.value  = { x: e.clientX - wx * next, y: e.clientY - wy * next }
    } else {
      pan.value = { x: pan.value.x - e.deltaX, y: pan.value.y - e.deltaY }
    }
  }

  function fitView(nodes: MindMapNode[], levelOf: (id: string) => number) {
    if (!nodes.length) return
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const n of nodes) {
      const sz = nodeSize(n, levelOf(n.id))
      minX = Math.min(minX, n.x - sz.w / 2); maxX = Math.max(maxX, n.x + sz.w / 2)
      minY = Math.min(minY, n.y - sz.h / 2); maxY = Math.max(maxY, n.y + sz.h / 2)
    }
    const margin = 60
    const W = maxX - minX + margin * 2, H = maxY - minY + margin * 2
    const isNarrow     = vpSize.value.w < 800
    const sideNoteOpen = vpSize.value.w >= 1100
    const topReserve    = isNarrow ? 150 : 170
    const bottomReserve = isNarrow ? 110 : 70
    const rightReserve  = sideNoteOpen ? 320 : 24
    const leftReserve   = 24
    const availW = Math.max(200, vpSize.value.w - leftReserve - rightReserve)
    const availH = Math.max(200, vpSize.value.h - topReserve  - bottomReserve)
    zoom.value = Math.max(0.45, Math.min(1.3, Math.min(availW / W, availH / H)))
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
    pan.value  = { x: leftReserve + availW / 2 - cx * zoom.value, y: topReserve + availH / 2 - cy * zoom.value }
  }

  function centerOn(n: MindMapNode) {
    pan.value = { x: vpSize.value.w / 2 - n.x * zoom.value, y: vpSize.value.h / 2 - n.y * zoom.value }
  }

  return { pan, zoom, transform, zoomPct, worldToScreen, screenToWorld, setZoomAtCenter, zoomIn, zoomOut, onWheel, fitView, centerOn }
}
