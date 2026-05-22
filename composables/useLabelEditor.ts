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
      const v = draftLabel.value.trim()
      if (v) callbacks.setLabel(id, v)
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
    const n = callbacks.nodeById(id)
    if (!n) return null
    const s   = worldToScreen(n.x, n.y)
    const lvl = callbacks.levelOf(id)
    const sz  = nodeSize(n, lvl)
    return {
      left:     s.x + 'px',
      top:      s.y + 'px',
      minWidth: Math.max(100, sz.w * zoom.value - 16) + 'px',
      fontSize: Math.max(14, sz.fontSize * zoom.value) + 'px',
    }
  })

  return { draftLabel, startEdit, commitLabelEditor, onEditorKey, editorStyle }
}
