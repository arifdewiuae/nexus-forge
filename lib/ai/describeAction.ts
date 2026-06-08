import type { MindMapAction } from '~/lib/ai/types'
import { ACTION_KIND } from '~/lib/mindmap/constants'

/** Short label for an action kind (the chip text on a suggestion card). */
const KIND_LABELS: Record<MindMapAction['kind'], string> = {
  add_node:      '+ new node',
  link_nodes:    '↗ link nodes',
  relabel:       '✎ rename',
  highlight:     '◎ flag',
  expand_branch: '⊕ expand branch',
  tidy_layout:   '⊹ tidy layout',
}

export function kindLabel(kind: string): string {
  return KIND_LABELS[kind as MindMapAction['kind']] ?? kind
}

/**
 * Human-readable, one-line description of a suggested action.
 * Pure: node labels are resolved via the injected `resolveLabel` (so it has no
 * store dependency and is unit-testable in isolation).
 */
export function describeAction(action: MindMapAction, resolveLabel: (id: string) => string): string {
  switch (action.kind) {
    case ACTION_KIND.add_node:
      return `Add "${action.label}" under "${resolveLabel(action.parentId)}"${action.description ? ' — ' + action.description : ''}`
    case ACTION_KIND.link_nodes:
      return `Link "${resolveLabel(action.fromId)}" → "${resolveLabel(action.toId)}"`
    case ACTION_KIND.relabel:
      return `Rename "${resolveLabel(action.nodeId)}" → "${action.label}"`
    case ACTION_KIND.highlight:
      return action.reason
    case ACTION_KIND.expand_branch:
      return `Expand "${resolveLabel(action.parentId)}" with ${action.children.length} new child nodes`
    default:
      return JSON.stringify(action)
  }
}
