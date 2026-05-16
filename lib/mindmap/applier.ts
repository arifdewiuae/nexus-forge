import type { MindMapAction } from '~/lib/ai/types'

interface GraphStore {
  nodeById(id: string): { id: string; x: number; y: number; label: string; parent: string | null } | null
  selectedId: string | null
  addNodeAt(parentId: string, x: number, y: number, label: string): string
  addChild(parentId: string, label: string): string | null
  reparent(childId: string, newParentId: string): boolean
  setLabel(id: string, label: string): void
  setHighlighted(ids: string[]): void
  clearHighlights(): void
  nodes: { id: string; x: number; y: number; label: string; parent: string | null }[]
}

export function applyAction(store: GraphStore, action: MindMapAction): void {
  switch (action.kind) {
    case 'add_node': {
      const parent = store.nodeById(action.parentId)
      if (!parent) return
      // Place at a small offset from parent
      store.addChild(action.parentId, action.label)
      break
    }

    case 'link_nodes': {
      store.reparent(action.toId, action.fromId)
      break
    }

    case 'relabel': {
      store.setLabel(action.nodeId, action.label)
      break
    }

    case 'highlight': {
      store.setHighlighted(action.nodeIds)
      // Auto-clear after 4 seconds
      setTimeout(() => store.clearHighlights(), 4000)
      break
    }

    case 'expand_branch': {
      const parent = store.nodeById(action.parentId)
      if (!parent) return
      for (const child of action.children) {
        store.addChild(action.parentId, child.label)
      }
      break
    }
  }
}
