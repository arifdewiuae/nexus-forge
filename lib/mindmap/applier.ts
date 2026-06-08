import { computeRadialLayout } from '~/lib/mindmap/layout'
import type { MindMapAction } from '~/lib/ai/types'
import { HIGHLIGHT_CLEAR_MS } from '~/lib/config'

/** Graph-mutation surface the applier needs (subset of useGraphStore). */
interface GraphStore {
  nodeById(id: string): { id: string; x: number; y: number; label: string; parent: string | null } | null
  selectedId: string | null
  editingId: string | null
  addNodeAt(parentId: string, x: number, y: number, label: string): string
  addChild(parentId: string, label: string): string | null
  addCrossLink(fromId: string, toId: string): void
  reparent(childId: string, newParentId: string): boolean
  setLabel(id: string, label: string): void
  applyLayout(positions: { id: string; x: number; y: number }[]): void
  nodes: { id: string; x: number; y: number; label: string; parent: string | null }[]
}

/** Highlight surface the applier needs (subset of useAIStore). */
interface HighlightStore {
  setHighlighted(ids: string[]): void
  clearHighlights(): void
}

/**
 * Apply one AI suggestion to the board. Most actions mutate the graph store;
 * `highlight` toggles transient AI-panel state, so both stores are passed in
 * explicitly rather than relying on a merged facade.
 */
export function applyAction(graph: GraphStore, ai: HighlightStore, action: MindMapAction): void {
  switch (action.kind) {
    case 'add_node': {
      const parent = graph.nodeById(action.parentId)
      if (!parent) return
      // Place at a small offset from parent
      graph.addChild(action.parentId, action.label)
      break
    }

    case 'link_nodes': {
      graph.addCrossLink(action.fromId, action.toId)
      break
    }

    case 'relabel': {
      graph.setLabel(action.nodeId, action.label)
      break
    }

    case 'highlight': {
      ai.setHighlighted(action.nodeIds)
      // Auto-clear after the configured highlight duration
      setTimeout(() => ai.clearHighlights(), HIGHLIGHT_CLEAR_MS)
      break
    }

    case 'expand_branch': {
      const parent = graph.nodeById(action.parentId)
      if (!parent) return
      for (const child of action.children) {
        graph.addChild(action.parentId, child.label)
      }
      // addChild triggers editingId on each call; clear it so no node auto-enters edit mode
      graph.editingId = null
      break
    }

    case 'tidy_layout': {
      const positions = computeRadialLayout(graph.nodes)
      graph.applyLayout(positions)
      break
    }
  }
}
