import { describe, it, expect } from 'vitest'
import { kindLabel, describeAction } from './describeAction'
import type { MindMapAction } from '~/lib/ai/types'

// Label resolver: 'root' → 'central idea', everything else echoes the id.
const resolve = (id: string) => (id === 'root' ? 'central idea' : id)

describe('kindLabel', () => {
  it('maps known kinds to a chip label', () => {
    expect(kindLabel('add_node')).toBe('+ new node')
    expect(kindLabel('expand_branch')).toBe('⊕ expand branch')
  })
  it('falls back to the raw kind for unknown values', () => {
    expect(kindLabel('frobnicate')).toBe('frobnicate')
  })
})

describe('describeAction', () => {
  it('add_node resolves the parent label and appends an optional description', () => {
    const a: MindMapAction = { kind: 'add_node', label: 'Pricing', parentId: 'root', description: 'missing' }
    expect(describeAction(a, resolve)).toBe('Add "Pricing" under "central idea" — missing')
  })
  it('add_node without a description omits the dash', () => {
    const a: MindMapAction = { kind: 'add_node', label: 'Pricing', parentId: 'root' }
    expect(describeAction(a, resolve)).toBe('Add "Pricing" under "central idea"')
  })
  it('link_nodes resolves both endpoints', () => {
    expect(describeAction({ kind: 'link_nodes', fromId: 'root', toId: 'x' }, resolve))
      .toBe('Link "central idea" → "x"')
  })
  it('relabel shows old → new', () => {
    expect(describeAction({ kind: 'relabel', nodeId: 'root', label: 'New' }, resolve))
      .toBe('Rename "central idea" → "New"')
  })
  it('highlight returns the reason verbatim', () => {
    expect(describeAction({ kind: 'highlight', nodeIds: ['a'], reason: 'belongs together' }, resolve))
      .toBe('belongs together')
  })
  it('expand_branch counts the children', () => {
    expect(describeAction({ kind: 'expand_branch', parentId: 'root', children: [{ label: 'a' }, { label: 'b' }] }, resolve))
      .toBe('Expand "central idea" with 2 new child nodes')
  })
  it('falls back to the id when the label cannot be resolved', () => {
    expect(describeAction({ kind: 'relabel', nodeId: 'ghost', label: 'X' }, resolve))
      .toBe('Rename "ghost" → "X"')
  })
})
