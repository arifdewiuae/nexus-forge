import type { Ref } from 'vue'

interface Viewport {
  pan: Ref<{ x: number; y: number }>
  zoom: Ref<number>
}

interface TouchPoint {
  id: number
  x: number
  y: number
}

const ZOOM_MIN = 0.3
const ZOOM_MAX = 2.6
const LONG_PRESS_MS = 500
const LONG_PRESS_MOVE_THRESHOLD = 8

/**
 * Attaches touch gesture handlers to a canvas element.
 * Handles:
 *  - Pinch-zoom: two fingers, preserves world-point under midpoint
 *  - Two-finger pan: midpoint delta when distance is stable
 *  - Long-press on node: triggers onLongPress(clientX, clientY)
 *
 * touch-action: none must already be set on the element.
 */
export function useTouchGestures(
  el: Ref<HTMLElement | null>,
  viewport: Viewport,
  onLongPress: (clientX: number, clientY: number) => void,
) {
  const activeTouches = new Map<number, TouchPoint>()

  // Pinch state — captured when second finger goes down
  let lastPinchDist = 0
  let lastMidX = 0
  let lastMidY = 0

  // Long-press state
  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  let longPressStartX = 0
  let longPressStartY = 0

  function dist(a: TouchPoint, b: TouchPoint): number {
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  function midpoint(a: TouchPoint, b: TouchPoint) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  }

  function cancelLongPress() {
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  function onTouchStart(e: TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]!
      activeTouches.set(t.identifier, { id: t.identifier, x: t.clientX, y: t.clientY })
    }

    if (activeTouches.size === 1) {
      const touch = [...activeTouches.values()][0]!
      longPressStartX = touch.x
      longPressStartY = touch.y
      cancelLongPress()
      longPressTimer = setTimeout(() => {
        onLongPress(longPressStartX, longPressStartY)
        longPressTimer = null
      }, LONG_PRESS_MS)
    } else {
      cancelLongPress()
    }

    if (activeTouches.size === 2) {
      const [a, b] = [...activeTouches.values()] as [TouchPoint, TouchPoint]
      lastPinchDist = dist(a, b)
      const mid = midpoint(a, b)
      lastMidX = mid.x
      lastMidY = mid.y
    }
  }

  function onTouchMove(e: TouchEvent) {
    e.preventDefault()

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]!
      activeTouches.set(t.identifier, { id: t.identifier, x: t.clientX, y: t.clientY })
    }

    if (activeTouches.size === 1) {
      const touch = [...activeTouches.values()][0]!
      const dx = touch.x - longPressStartX
      const dy = touch.y - longPressStartY
      if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_THRESHOLD) {
        cancelLongPress()
      }
    }

    if (activeTouches.size === 2) {
      const [a, b] = [...activeTouches.values()] as [TouchPoint, TouchPoint]
      const newDist = dist(a, b)
      const mid = midpoint(a, b)

      const panDeltaX = mid.x - lastMidX
      const panDeltaY = mid.y - lastMidY

      if (newDist > 0 && lastPinchDist > 0) {
        const scale = newDist / lastPinchDist
        const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, viewport.zoom.value * scale))

        // Preserve world point under midpoint
        const wx = (mid.x - viewport.pan.value.x) / viewport.zoom.value
        const wy = (mid.y - viewport.pan.value.y) / viewport.zoom.value

        viewport.zoom.value = newZoom
        viewport.pan.value = {
          x: mid.x - wx * newZoom + panDeltaX,
          y: mid.y - wy * newZoom + panDeltaY,
        }
      } else {
        // Stable distance: pure two-finger pan
        viewport.pan.value = {
          x: viewport.pan.value.x + panDeltaX,
          y: viewport.pan.value.y + panDeltaY,
        }
      }

      lastPinchDist = newDist
      lastMidX = mid.x
      lastMidY = mid.y
    }
  }

  function onTouchEnd(e: TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      activeTouches.delete(e.changedTouches[i]!.identifier)
    }
    if (activeTouches.size < 2) {
      lastPinchDist = 0
    }
    if (activeTouches.size === 0) {
      cancelLongPress()
    }
  }

  function attach() {
    const target = el.value
    if (!target) return
    target.addEventListener('touchstart', onTouchStart, { passive: false })
    target.addEventListener('touchmove', onTouchMove, { passive: false })
    target.addEventListener('touchend', onTouchEnd)
    target.addEventListener('touchcancel', onTouchEnd)
  }

  function detach() {
    const target = el.value
    if (!target) return
    target.removeEventListener('touchstart', onTouchStart)
    target.removeEventListener('touchmove', onTouchMove)
    target.removeEventListener('touchend', onTouchEnd)
    target.removeEventListener('touchcancel', onTouchEnd)
    cancelLongPress()
  }

  return { attach, detach }
}
