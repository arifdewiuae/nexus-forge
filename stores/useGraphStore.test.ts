// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock Nuxt-specific globals before importing the store
vi.stubGlobal('import.meta.client', true)

// skipHydrate from pinia is available, but we also need its Nuxt marker to be
// a no-op (it already is in non-SSR mode).
vi.mock('#app', () => ({}))
vi.mock('#imports', () => ({}))

// Dynamic import AFTER stubs so the store sees them
const { useGraphStore } = await import('./useGraphStore')

describe('useGraphStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  describe('undo / redo invariants', () => {
    it('undo restores previous state', () => {
      const G = useGraphStore()
      const rootId = G.rootNode()!.id
      const childId = G.addChild(rootId, 'test-node')!
      expect(G.nodes.some((n: { id: string }) => n.id === childId)).toBe(true)
      G.undo()
      expect(G.nodes.some((n: { id: string }) => n.id === childId)).toBe(false)
    })

    it('redo re-applies undone change', () => {
      const G = useGraphStore()
      const rootId = G.rootNode()!.id
      const childId = G.addChild(rootId, 'redo-test')!
      G.undo()
      expect(G.nodes.some((n: { id: string }) => n.id === childId)).toBe(false)
      G.redo()
      expect(G.nodes.some((n: { id: string }) => n.id === childId)).toBe(true)
    })

    it('canUndo is false on a fresh store', () => {
      const G = useGraphStore()
      expect(G.canUndo).toBe(false)
    })

    it('canRedo is false when nothing has been undone', () => {
      const G = useGraphStore()
      G.addChild(G.rootNode()!.id, 'x')
      expect(G.canRedo).toBe(false)
    })
  })

  describe('reparent cycle rejection', () => {
    it('rejects reparenting a node to its own descendant', () => {
      const G = useGraphStore()
      const rootId = G.rootNode()!.id
      const childId = G.addChild(rootId, 'child')!
      const grandId = G.addChild(childId, 'grand')!
      const result = G.reparent(childId, grandId)
      expect(result).toBe(false)
    })

    it('rejects reparenting the root', () => {
      const G = useGraphStore()
      const rootId = G.rootNode()!.id
      const childId = G.addChild(rootId, 'child')!
      const result = G.reparent(rootId, childId)
      expect(result).toBe(false)
    })

    it('allows reparenting a non-ancestor', () => {
      const G = useGraphStore()
      const rootId = G.rootNode()!.id
      const a = G.addChild(rootId, 'A')!
      const b = G.addChild(rootId, 'B')!
      const result = G.reparent(a, b)
      expect(result).toBe(true)
      expect(G.nodeById(a)?.parent).toBe(b)
    })
  })

  describe('deleteSubtree', () => {
    it('removes node and all descendants', () => {
      const G = useGraphStore()
      const rootId = G.rootNode()!.id
      const childId = G.addChild(rootId, 'child')!
      const grandId = G.addChild(childId, 'grand')!
      G.deleteSubtree(childId)
      expect(G.nodes.find((n: { id: string }) => n.id === childId)).toBeUndefined()
      expect(G.nodes.find((n: { id: string }) => n.id === grandId)).toBeUndefined()
    })

    it('falls back selection to root when deleted node was selected', () => {
      const G = useGraphStore()
      const rootId = G.rootNode()!.id
      const childId = G.addChild(rootId, 'child')!
      G.selectedId = childId
      G.deleteSubtree(childId)
      expect(G.selectedId).toBe(rootId)
    })

    it('does nothing when trying to delete root', () => {
      const G = useGraphStore()
      const rootId = G.rootNode()!.id
      const countBefore = G.nodes.length
      G.deleteSubtree(rootId)
      expect(G.nodes.length).toBe(countBefore)
    })
  })

  describe('importJSON', () => {
    it('imports valid JSON and replaces graph', () => {
      const G = useGraphStore()
      const json = JSON.stringify({
        version: 1, title: 'Imported', nextId: 5,
        nodes: [
          { id: 'root', x: 0, y: 0, label: 'Root', parent: null },
          { id: 'n1',   x: 100, y: 0, label: 'Child', parent: 'root' },
        ],
      })
      const result = G.importJSON(json)
      expect(result.ok).toBe(true)
      expect(G.title).toBe('Imported')
      expect(G.nodes.length).toBe(2)
    })

    it('returns error on malformed payload', () => {
      const G = useGraphStore()
      const result = G.importJSON('not json')
      expect(result.ok).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('returns error on empty nodes array', () => {
      const G = useGraphStore()
      const result = G.importJSON(JSON.stringify({ nodes: [] }))
      expect(result.ok).toBe(false)
    })

    it('patches orphaned parent references', () => {
      const G = useGraphStore()
      const json = JSON.stringify({
        title: 'test', nextId: 10,
        nodes: [
          { id: 'root', x: 0, y: 0, label: 'Root', parent: null },
          { id: 'n1',   x: 100, y: 0, label: 'Orphan', parent: 'does-not-exist' },
        ],
      })
      const result = G.importJSON(json)
      expect(result.ok).toBe(true)
      expect(G.nodeById('n1')?.parent).toBeNull()
    })
  })
})
