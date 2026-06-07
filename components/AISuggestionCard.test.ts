// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AISuggestionCard from './AISuggestionCard.vue'
import type { MindMapAction } from '~/lib/ai/types'

beforeEach(() => {
  // The card reads node labels from the graph store (auto-imported global in app).
  vi.stubGlobal('useGraphStore', () => ({
    nodeById: (id: string) => ({ id, label: id === 'root' ? 'central idea' : id, x: 0, y: 0, parent: null }),
  }))
})

describe('AISuggestionCard', () => {
  it('renders the kind label and a human-readable description', () => {
    const w = mount(AISuggestionCard, {
      props: { action: { kind: 'add_node', label: 'New', parentId: 'root' }, applied: false },
    })
    expect(w.text()).toContain('new node')
    expect(w.text()).toContain('Add "New" under "central idea"')
  })

  it('emits apply when the apply button is clicked', async () => {
    const w = mount(AISuggestionCard, { props: { action: { kind: 'tidy_layout' }, applied: false } })
    await w.get('.ai-suggestion-btn').trigger('click')
    expect(w.emitted('apply')).toBeTruthy()
  })

  it('emits reject from the dismiss button', async () => {
    const w = mount(AISuggestionCard, { props: { action: { kind: 'tidy_layout' }, applied: false } })
    await w.get('.ai-suggestion-reject').trigger('click')
    expect(w.emitted('reject')).toBeTruthy()
  })

  it('shows the applied state and emits undo', async () => {
    const w = mount(AISuggestionCard, { props: { action: { kind: 'tidy_layout' }, applied: true } })
    expect(w.text()).toContain('applied')
    expect(w.find('.ai-suggestion-btn').exists()).toBe(false) // apply hidden once applied
    await w.get('.ai-suggestion-undo').trigger('click')
    expect(w.emitted('undo')).toBeTruthy()
  })

  it('describes every action kind without throwing', () => {
    const actions: MindMapAction[] = [
      { kind: 'link_nodes', fromId: 'root', toId: 'a' },
      { kind: 'relabel', nodeId: 'root', label: 'X' },
      { kind: 'highlight', nodeIds: ['a'], reason: 'these two belong together' },
      { kind: 'expand_branch', parentId: 'root', children: [{ label: 'c' }] },
      { kind: 'tidy_layout' },
    ]
    for (const action of actions) {
      const w = mount(AISuggestionCard, { props: { action, applied: false } })
      expect(w.text().length).toBeGreaterThan(0)
    }
  })

  it('icon-only action buttons carry aria-labels', () => {
    const w = mount(AISuggestionCard, { props: { action: { kind: 'tidy_layout' }, applied: false } })
    expect(w.get('.ai-suggestion-reject').attributes('aria-label')).toBeTruthy()
  })
})
