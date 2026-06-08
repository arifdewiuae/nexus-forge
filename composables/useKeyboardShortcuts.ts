import { onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { Ref } from 'vue'
import { TOOL } from '~/lib/mindmap/constants'
import type { Tool } from '~/lib/mindmap/constants'
import type { MindMapNode } from '~/lib/ai/types'

/** Things the shortcut layer needs from the page that it can't reach itself. */
export interface KeyboardShortcutHandlers {
  /** ⌘/Ctrl+Enter — start an analysis. */
  analyze: () => void
  /** Escape, when the AI panel is the front-most layer. */
  closeAIPanel: () => void
  /** Escape, when a modal is open. */
  closeModal: () => void
  isModalOpen: () => boolean
  /** Agent-selector overlay visibility (Escape dismisses it). */
  agentSelectorOpen: Ref<boolean>
  /** Tab/Enter — begin inline label editing for a node. */
  startEdit: (node: MindMapNode) => void
  /** F — fit the whole board into view. */
  fitView: () => void
}

const TOOL_KEYS: Record<string, Tool> = {
  v: TOOL.select, a: TOOL.add, l: TOOL.branch, c: TOOL.connect, e: TOOL.erase,
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

/**
 * Global keyboard shortcuts for the board. Owns the window keydown listener
 * (added on mount, removed on unmount) and reads graph/AI state from the
 * stores directly; page-specific actions arrive via `handlers`.
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const graph = useGraphStore()
  const ai = useAIStore()

  function onKey(e: KeyboardEvent) {
    // Undo / redo — works even while editing text.
    if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault()
      if (e.shiftKey) graph.redo(); else graph.undo()
      return
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault(); handlers.analyze(); return
    }

    // Escape unwinds the front-most layer.
    if (e.key === 'Escape') {
      if (handlers.isModalOpen()) { handlers.closeModal(); return }
      if (handlers.agentSelectorOpen.value) { handlers.agentSelectorOpen.value = false; return }
      if (graph.editingId) { graph.editingId = null; return }
      if (graph.linkFromId) { graph.linkFromId = null; return }
      if (ai.isAIPanelOpen) { handlers.closeAIPanel(); return }
    }

    // Below here, never steal keys from a text field.
    if (isEditableTarget(e.target)) return

    const tool = TOOL_KEYS[e.key.toLowerCase()]
    if (tool) { graph.tool = tool; graph.linkFromId = null; return }

    if (e.key === 'Tab') {
      e.preventDefault()
      const parentId = graph.selectedId ?? graph.rootNode()?.id
      if (!parentId) return
      graph.addChild(parentId, 'new idea')
      nextTick(() => {
        const node = graph.nodeById(graph.selectedId ?? '')
        if (node) handlers.startEdit(node)
      })
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const node = graph.nodeById(graph.selectedId ?? '')
      if (node) handlers.startEdit(node)
      return
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (graph.selectedId && graph.selectedId !== graph.rootNode()?.id) {
        e.preventDefault(); graph.deleteSubtree(graph.selectedId)
      }
      return
    }
    if (e.key.toLowerCase() === 'f') { e.preventDefault(); handlers.fitView(); return }
  }

  onMounted(() => window.addEventListener('keydown', onKey))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
}
