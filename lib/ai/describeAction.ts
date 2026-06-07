import type { MindMapAction } from '~/lib/ai/types'

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
    case 'add_node':
      return `Add "${action.label}" under "${resolveLabel(action.parentId)}"${action.description ? ' — ' + action.description : ''}`
    case 'link_nodes':
      return `Link "${resolveLabel(action.fromId)}" → "${resolveLabel(action.toId)}"`
    case 'relabel':
      return `Rename "${resolveLabel(action.nodeId)}" → "${action.label}"`
    case 'highlight':
      return action.reason
    case 'expand_branch':
      return `Expand "${resolveLabel(action.parentId)}" with ${action.children.length} new child nodes`
    default:
      return JSON.stringify(action)
  }
}
