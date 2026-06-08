import { ref, computed, nextTick } from 'vue'
import type { Ref } from 'vue'
import { nodeSize } from '~/lib/mindmap/geometry'
import type { MindMapNode } from '~/lib/ai/types'

interface LabelEditorCallbacks {
  getEditingId: () => string | null
  setEditingId: (id: string | null) => void
  setLabel: (id: string, label: string) => void
  nodeById: (id: string) => MindMapNode | undefined
  levelOf: (id: string) => number
}

export function useLabelEditor(
  zoom: Ref<number>,
  worldToScreen: (wx: number, wy: number) => { x: number; y: number },
  editorEl: Ref<HTMLInputElement | null>,
  callbacks: LabelEditorCallbacks,
) {
  const draftLabel = ref('')

  function startEdit(node: MindMapNode) {
    callbacks.setEditingId(node.id)
    draftLabel.value = node.label
    nextTick(() => { editorEl.value?.focus(); editorEl.value?.select() })
  }

  function commitLabelEditor(save: boolean) {
    const id = callbacks.getEditingId()
    if (!id) return
    if (save) {
      const trimmed = draftLabel.value.trim()
      if (trimmed) callbacks.setLabel(id, trimmed)
    }
    callbacks.setEditingId(null); draftLabel.value = ''
  }

  function onEditorKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitLabelEditor(true) }
    else if (e.key === 'Escape') { e.preventDefault(); commitLabelEditor(false) }
  }

  const editorStyle = computed(() => {
    const id = callbacks.getEditingId()
    if (!id) return null

    const node = callbacks.nodeById(id)
    if (!node) return null

    const screen = worldToScreen(node.x, node.y)
    const level  = callbacks.levelOf(id)
    const size   = nodeSize(node, level)

    return {
      left:     screen.x + 'px',
      top:      screen.y + 'px',
      minWidth: Math.max(100, size.w * zoom.value - 16) + 'px',
      fontSize: Math.max(14, size.fontSize * zoom.value) + 'px',
    }
  })

  return { draftLabel, startEdit, commitLabelEditor, onEditorKey, editorStyle }
}
