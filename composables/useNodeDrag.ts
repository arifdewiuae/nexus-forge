import type { Ref } from 'vue'
import type { MindMapNode } from '~/lib/ai/types'

interface DragCallbacks {
  beginDrag: () => void
  moveNode: (id: string, x: number, y: number) => void
  endDrag: (moved: boolean) => void
  addNodeAt: (parentId: string, x: number, y: number, label: string) => string
}

export function useNodeDrag(
  zoom: Ref<number>,
  callbacks: DragCallbacks,
) {
  let dragInfo: {
    nodeId: string
    startX: number
    startY: number
    origX: number
    origY: number
    moved: boolean
  } | null = null

  function onNodeDragStart(e: PointerEvent, node: MindMapNode) {
    dragInfo = { nodeId: node.id, startX: e.clientX, startY: e.clientY, origX: node.x, origY: node.y, moved: false }
    window.addEventListener('pointermove', onNodeMove)
    window.addEventListener('pointerup', onNodeUp)
  }

  function onNodeMove(e: PointerEvent) {
    if (!dragInfo) return
    const dx = (e.clientX - dragInfo.startX) / zoom.value
    const dy = (e.clientY - dragInfo.startY) / zoom.value
    if (!dragInfo.moved && Math.hypot(dx * zoom.value, dy * zoom.value) > 3) {
      dragInfo.moved = true; callbacks.beginDrag()
    }
    if (dragInfo.moved) callbacks.moveNode(dragInfo.nodeId, dragInfo.origX + dx, dragInfo.origY + dy)
  }

  function onNodeUp() {
    if (!dragInfo) return
    callbacks.endDrag(dragInfo.moved); dragInfo = null
    window.removeEventListener('pointermove', onNodeMove)
    window.removeEventListener('pointerup', onNodeUp)
  }

  function cleanup() {
    window.removeEventListener('pointermove', onNodeMove)
    window.removeEventListener('pointerup', onNodeUp)
  }

  return { onNodeDragStart, cleanup }
}
