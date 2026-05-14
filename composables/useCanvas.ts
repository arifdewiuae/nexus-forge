import {
  Canvas,
  Rect,
  Ellipse,
  Textbox,
  Line,
  PencilBrush,
  Point,
  Shadow,
  ActiveSelection,
  type FabricObject,
  type TPointerEvent,
  type TPointerEventInfo,
} from 'fabric'
import { nanoid } from 'nanoid'
import { CANVAS_DEFAULTS, STICKY_COLORS } from '~/lib/config'
import { serializeBoard } from '~/lib/canvas/boardSerializer'
import { applyAction, applyAll } from '~/lib/canvas/suggestionApplier'
import type { CanvasTool } from '~/stores/boardStore'
import type { BoardAction } from '~/lib/ai/types'

let stickyColorIndex = 0

function assignId(obj: FabricObject): void {
  obj.id = nanoid(8)
}

function storageKey(boardId: string): string {
  return `nf:canvas:${boardId}`
}

export function useCanvas() {
  const store = useBoardStore()
  const fc = shallowRef<Canvas | null>(null)
  let currentBoardId = ''
  let isPanning = false
  let spaceHeld = false
  let lastPanPos = { x: 0, y: 0 }
  let isDrawingShape = false
  let shapeOrigin = new Point(0, 0)
  let activeShape: FabricObject | null = null
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  // ── Persistence ─────────────────────────────────────────────────────────────

  function scheduleSave(canvas: Canvas): void {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const json = canvas.toObject(['id', 'data'])
      localStorage.setItem(storageKey(currentBoardId), JSON.stringify(json))
      saveTimer = null
    }, 400)
  }

  async function restoreFromStorage(canvas: Canvas): Promise<void> {
    const raw = localStorage.getItem(storageKey(currentBoardId))
    if (!raw) return
    try {
      await canvas.loadFromJSON(JSON.parse(raw))
      canvas.renderAll()
      store.hasUnsavedChanges = false
    } catch {
      // Corrupt or outdated data — start fresh
      localStorage.removeItem(storageKey(currentBoardId))
    }
  }

  // ── Initialization ─────────────────────────────────────────────────────────

  async function init(canvasEl: HTMLCanvasElement, container: HTMLElement, boardId: string): Promise<void> {
    currentBoardId = boardId

    // Ensure font metrics are available before Fabric.js measures any text.
    // Without this, cursor positions drift when the actual font differs from
    // the fallback used during canvas initialization.
    await document.fonts.ready

    const canvas = new Canvas(canvasEl, {
      backgroundColor: CANVAS_DEFAULTS.BACKGROUND,
      selection: true,
      preserveObjectStacking: true,
      fireRightClick: true,
      stopContextMenu: true,
      enableRetinaScaling: true,
      width: container.clientWidth,
      height: container.clientHeight,
    })

    canvas.freeDrawingBrush = new PencilBrush(canvas)
    canvas.freeDrawingBrush.color = '#e2e8f0'
    canvas.freeDrawingBrush.width = 2

    fc.value = canvas

    bindResize(canvas, container)
    bindKeyboard(canvas)
    bindZoomPan(canvas)
    bindShapeCreation(canvas)

    canvas.on('object:modified', () => { store.hasUnsavedChanges = true; scheduleSave(canvas) })
    canvas.on('object:added',    () => { store.hasUnsavedChanges = true; scheduleSave(canvas) })
    canvas.on('object:removed',  () => { store.hasUnsavedChanges = true; scheduleSave(canvas) })

    await restoreFromStorage(canvas)
  }

  // ── Resize ─────────────────────────────────────────────────────────────────

  function bindResize(canvas: Canvas, container: HTMLElement): void {
    const ro = new ResizeObserver(() => {
      canvas.setDimensions({ width: container.clientWidth, height: container.clientHeight })
      canvas.renderAll()
    })
    ro.observe(container)
    onUnmounted(() => ro.disconnect())
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────

  function bindKeyboard(canvas: Canvas): void {
    const toolShortcuts: Record<string, CanvasTool> = {
      v: 'select', p: 'draw', r: 'rect',
      e: 'ellipse', s: 'sticky', t: 'text', l: 'arrow',
    }

    const onKeydown = (event: KeyboardEvent): void => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return

      if (event.code === 'Space') {
        event.preventDefault()
        spaceHeld = true
        canvas.defaultCursor = 'grab'
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        canvas.getActiveObjects().forEach(obj => canvas.remove(obj))
        canvas.discardActiveObject()
        canvas.renderAll()
        return
      }

      if (event.key === 'Escape') {
        canvas.discardActiveObject()
        canvas.renderAll()
        store.setTool('select')
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault()
        const all = canvas.getObjects()
        if (all.length > 0) {
          canvas.setActiveObject(new ActiveSelection(all, { canvas }))
          canvas.requestRenderAll()
        }
        return
      }

      const shortcut = toolShortcuts[event.key.toLowerCase()]
      if (shortcut) store.setTool(shortcut)
    }

    const onKeyup = (event: KeyboardEvent): void => {
      if (event.code === 'Space') {
        spaceHeld = false
        isPanning = false
        canvas.defaultCursor = 'default'
      }
    }

    window.addEventListener('keydown', onKeydown)
    window.addEventListener('keyup', onKeyup)
    onUnmounted(() => {
      window.removeEventListener('keydown', onKeydown)
      window.removeEventListener('keyup', onKeyup)
    })
  }

  // ── Zoom + Pan ──────────────────────────────────────────────────────────────

  function bindZoomPan(canvas: Canvas): void {
    canvas.on('mouse:wheel', ({ e }: TPointerEventInfo<WheelEvent>) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const zoom = Math.min(
        Math.max(canvas.getZoom() * (0.999 ** e.deltaY), CANVAS_DEFAULTS.ZOOM_MIN),
        CANVAS_DEFAULTS.ZOOM_MAX,
      )
      canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), zoom)
      store.setZoom(zoom)
    })

    canvas.on('mouse:down', ({ e }: TPointerEventInfo<TPointerEvent>) => {
      const nativeEvent = e as MouseEvent
      if (spaceHeld || nativeEvent.button === 1) {
        isPanning = true
        lastPanPos = { x: nativeEvent.clientX, y: nativeEvent.clientY }
        canvas.selection = false
        canvas.defaultCursor = 'grabbing'
      }
    })

    canvas.on('mouse:move', ({ e }: TPointerEventInfo<TPointerEvent>) => {
      if (!isPanning) return
      const nativeEvent = e as MouseEvent
      const vpt = canvas.viewportTransform
      vpt[4] += nativeEvent.clientX - lastPanPos.x
      vpt[5] += nativeEvent.clientY - lastPanPos.y
      lastPanPos = { x: nativeEvent.clientX, y: nativeEvent.clientY }
      canvas.requestRenderAll()
    })

    canvas.on('mouse:up', () => {
      if (isPanning) {
        isPanning = false
        canvas.selection = true
        canvas.defaultCursor = spaceHeld ? 'grab' : 'default'
      }
    })
  }

  // ── Shape creation ──────────────────────────────────────────────────────────

  function bindShapeCreation(canvas: Canvas): void {
    canvas.on('mouse:down', ({ pointer, target }: TPointerEventInfo<TPointerEvent> & { pointer?: Point; target?: FabricObject }) => {
      if (!pointer || isPanning) return
      const tool = store.activeTool
      if (tool === 'select' || tool === 'draw') return
      if (target && tool !== 'rect' && tool !== 'ellipse' && tool !== 'arrow') return

      if (tool === 'sticky') { addStickyNote(canvas, pointer); store.setTool('select'); return }
      if (tool === 'text')   { addText(canvas, pointer);       store.setTool('select'); return }

      isDrawingShape = true
      shapeOrigin = pointer

      if (tool === 'rect') {
        const shape = new Rect({
          left: pointer.x, top: pointer.y, width: 1, height: 1,
          fill: 'transparent', stroke: '#6366f1', strokeWidth: 2, rx: 4, ry: 4,
        })
        assignId(shape)
        canvas.add(shape)
        activeShape = shape
      }

      if (tool === 'ellipse') {
        const shape = new Ellipse({
          left: pointer.x, top: pointer.y, rx: 1, ry: 1,
          fill: 'transparent', stroke: '#6366f1', strokeWidth: 2,
        })
        assignId(shape)
        canvas.add(shape)
        activeShape = shape
      }

      if (tool === 'arrow') {
        // Fabric.js Line stores x1/y1/x2/y2 relative to the object center.
        // Initialize with a proper zero-length line so setCoords is clean.
        const shape = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: '#94a3b8', strokeWidth: 2, strokeLineCap: 'round',
          selectable: false, evented: false,
        })
        assignId(shape)
        canvas.add(shape)
        activeShape = shape
      }
    })

    canvas.on('mouse:move', ({ pointer }: TPointerEventInfo<TPointerEvent> & { pointer?: Point }) => {
      if (!isDrawingShape || !activeShape || !pointer) return
      const dx = pointer.x - shapeOrigin.x
      const dy = pointer.y - shapeOrigin.y
      const tool = store.activeTool

      if (tool === 'rect' && activeShape instanceof Rect) {
        activeShape.set({
          left:   dx > 0 ? shapeOrigin.x : pointer.x,
          top:    dy > 0 ? shapeOrigin.y : pointer.y,
          width:  Math.abs(dx),
          height: Math.abs(dy),
        })
        activeShape.setCoords()
      }

      if (tool === 'ellipse' && activeShape instanceof Ellipse) {
        activeShape.set({
          left: dx > 0 ? shapeOrigin.x : pointer.x,
          top:  dy > 0 ? shapeOrigin.y : pointer.y,
          rx:   Math.abs(dx) / 2,
          ry:   Math.abs(dy) / 2,
        })
        activeShape.setCoords()
      }

      if (tool === 'arrow' && activeShape instanceof Line) {
        // Fabric.js Line coords are relative to the object center — compute explicitly.
        const cx = (shapeOrigin.x + pointer.x) / 2
        const cy = (shapeOrigin.y + pointer.y) / 2
        activeShape.set({
          x1: shapeOrigin.x - cx,
          y1: shapeOrigin.y - cy,
          x2: pointer.x    - cx,
          y2: pointer.y    - cy,
          left:   cx,
          top:    cy,
          width:  Math.abs(dx),
          height: Math.abs(dy),
        })
        activeShape.setCoords()
      }

      canvas.requestRenderAll()
    })

    canvas.on('mouse:up', () => {
      if (!isDrawingShape) return
      isDrawingShape = false

      if (activeShape) {
        activeShape.setCoords()
        const bounds = activeShape.getBoundingRect()
        if (bounds.width < 4 && bounds.height < 4) {
          canvas.remove(activeShape)
        } else {
          // Make line selectable again after it's been drawn
          if (activeShape instanceof Line) {
            activeShape.set({ selectable: true, evented: true })
          }
          canvas.setActiveObject(activeShape)
        }
      }
      activeShape = null
      store.setTool('select')
    })
  }

  // ── Shape helpers ───────────────────────────────────────────────────────────

  function addStickyNote(canvas: Canvas, pointer: Point): void {
    const color = STICKY_COLORS[stickyColorIndex % STICKY_COLORS.length]
    stickyColorIndex++

    const sticky = new Textbox('Double-click to edit', {
      left: pointer.x - 90, top: pointer.y - 50, width: 180,
      backgroundColor: color, fill: '#1e293b',
      fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif',
      cursorColor: '#1e293b', cursorWidth: 2,
      shadow: new Shadow({ color: 'rgba(0,0,0,0.25)', blur: 12, offsetX: 2, offsetY: 4 }),
    })
    assignId(sticky)
    sticky.data = { type: 'sticky', stickyColor: color }
    canvas.add(sticky)
    canvas.setActiveObject(sticky)
    canvas.renderAll()
  }

  function addText(canvas: Canvas, pointer: Point): void {
    const text = new Textbox('Text', {
      left: pointer.x, top: pointer.y, width: 200,
      fill: '#e2e8f0', fontSize: 18, fontFamily: 'Inter, system-ui, sans-serif',
      cursorColor: '#e2e8f0', cursorWidth: 2,
    })
    assignId(text)
    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.renderAll()
  }

  // ── Tool mode sync ──────────────────────────────────────────────────────────

  watch(() => store.activeTool, (tool: CanvasTool) => {
    const canvas = fc.value
    if (!canvas) return
    canvas.isDrawingMode = tool === 'draw'
    canvas.selection = tool === 'select'
    canvas.defaultCursor = tool === 'select' || tool === 'draw' ? 'default' : 'crosshair'
  })

  // ── Cleanup ─────────────────────────────────────────────────────────────────

  onUnmounted(() => {
    if (saveTimer) clearTimeout(saveTimer)
    fc.value?.dispose()
    fc.value = null
  })

  // ── Public API ──────────────────────────────────────────────────────────────

  function getSerializedBoard(): ReturnType<typeof serializeBoard> | null {
    const canvas = fc.value
    if (!canvas) return null
    return serializeBoard(canvas.getObjects(), currentBoardId)
  }

  function exportPNG(): string | undefined {
    return fc.value?.toDataURL({ format: 'png', multiplier: 2 })
  }

  function exportJSON(): string | undefined {
    if (!fc.value) return undefined
    return JSON.stringify(fc.value.toObject(['id', 'data']), null, 2)
  }

  function clearBoard(): void {
    const canvas = fc.value
    if (!canvas) return
    canvas.clear()
    canvas.backgroundColor = CANVAS_DEFAULTS.BACKGROUND
    canvas.renderAll()
    localStorage.removeItem(storageKey(currentBoardId))
    store.hasUnsavedChanges = false
  }

  function resetZoom(): void {
    const canvas = fc.value
    if (!canvas) return
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    store.setZoom(1)
  }

  async function applyBoardAction(action: BoardAction): Promise<void> {
    if (!fc.value) return
    await applyAction(fc.value, action)
    scheduleSave(fc.value)
  }

  async function applyAllBoardActions(actions: BoardAction[]): Promise<void> {
    if (!fc.value) return
    await applyAll(fc.value, actions)
    scheduleSave(fc.value)
  }

  return { init, getSerializedBoard, exportPNG, exportJSON, clearBoard, resetZoom, applyBoardAction, applyAllBoardActions }
}
