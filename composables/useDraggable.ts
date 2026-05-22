import { ref } from 'vue'

export interface DraggablePosition {
  x: number
  y: number
}

/**
 * Generic floating-panel drag composable.
 * Attach startDrag to a mousedown handler on the panel's drag handle.
 */
export function useDraggable(initial: DraggablePosition) {
  const pos        = ref<DraggablePosition>({ ...initial })
  const isDragging = ref(false)
  let dragOffset   = { x: 0, y: 0 }

  function startDrag(e: MouseEvent) {
    isDragging.value  = true
    dragOffset = { x: e.clientX - pos.value.x, y: e.clientY - pos.value.y }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging.value) return
    pos.value = { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
  }

  function onMouseUp() {
    isDragging.value = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup',   onMouseUp)
  }

  function cleanup() {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup',   onMouseUp)
  }

  return { pos, isDragging, startDrag, cleanup }
}
