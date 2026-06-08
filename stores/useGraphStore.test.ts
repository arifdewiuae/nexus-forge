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
const { GRAPH_LIMITS, PLACEMENT } = await import('~/lib/config')

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

  describe('addChild placement', () => {
    it('places a new child at the configured radius from its parent', () => {
      const G = useGraphStore()
      const root = G.rootNode()!
      const childId = G.addChild(root.id, 'placed')!
      const child = G.nodeById(childId)!
      const dist = Math.hypot(child.x - root.x, child.y - root.y)
      expect(Math.round(dist)).toBe(PLACEMENT.CHILD_RADIUS)
    })

    it('returns null for a non-existent parent', () => {
      const G = useGraphStore()
      expect(G.addChild('nope', 'x')).toBeNull()
    })
  })

  describe('field caps', () => {
    it('truncates a node label to the max length', () => {
      const G = useGraphStore()
      const id = G.addChild(G.rootNode()!.id, 'x')!
      G.setLabel(id, 'a'.repeat(500))
      expect(G.nodeById(id)!.label.length).toBe(GRAPH_LIMITS.LABEL_MAX_CHARS)
    })

    it('uses a placeholder for an empty label', () => {
      const G = useGraphStore()
      const id = G.addChild(G.rootNode()!.id, 'x')!
      G.setLabel(id, '')
      expect(G.nodeById(id)!.label).toBe('·')
    })

    it('truncates the board title to the max length', () => {
      const G = useGraphStore()
      G.setTitle('t'.repeat(200))
      expect(G.title.length).toBe(GRAPH_LIMITS.TITLE_MAX_CHARS)
    })
  })

  describe('cross-links', () => {
    it('adds a cross-link between two nodes', () => {
      const G = useGraphStore()
      const a = G.addChild(G.rootNode()!.id, 'A')!
      const b = G.addChild(G.rootNode()!.id, 'B')!
      G.addCrossLink(a, b)
      expect(G.crossLinks).toHaveLength(1)
      expect(G.crossLinksOf(a)).toHaveLength(1)
    })

    it('does not duplicate an existing cross-link', () => {
      const G = useGraphStore()
      const a = G.addChild(G.rootNode()!.id, 'A')!
      const b = G.addChild(G.rootNode()!.id, 'B')!
      G.addCrossLink(a, b)
      G.addCrossLink(a, b)
      expect(G.crossLinks).toHaveLength(1)
    })

    it('ignores a cross-link to a missing node', () => {
      const G = useGraphStore()
      const a = G.addChild(G.rootNode()!.id, 'A')!
      G.addCrossLink(a, 'ghost')
      expect(G.crossLinks).toHaveLength(0)
    })

    it('removes a cross-link by id', () => {
      const G = useGraphStore()
      const a = G.addChild(G.rootNode()!.id, 'A')!
      const b = G.addChild(G.rootNode()!.id, 'B')!
      G.addCrossLink(a, b)
      G.removeCrossLink(G.crossLinks[0]!.id)
      expect(G.crossLinks).toHaveLength(0)
    })
  })

  describe('tree queries', () => {
    it('relate children, descendants, ancestors and levels', () => {
      const G = useGraphStore()
      const root = G.rootNode()!.id
      const a = G.addChild(root, 'A')!
      const b = G.addChild(a, 'B')!
      expect(G.childrenOf(root).some((n: { id: string }) => n.id === a)).toBe(true)
      expect(G.descendantsOf(root)).toContain(b)
      expect(G.ancestorsOf(b).map((n: { id: string }) => n.id)).toContain(a)
      expect(G.levelOf(b)).toBe(G.levelOf(a) + 1)
    })
  })

  describe('applyLayout', () => {
    it('moves nodes to the provided positions', () => {
      const G = useGraphStore()
      const id = G.addChild(G.rootNode()!.id, 'X')!
      G.applyLayout([{ id, x: 999, y: -999 }])
      expect(G.nodeById(id)).toMatchObject({ x: 999, y: -999 })
    })
  })

  describe('exportJSON', () => {
    it('round-trips the title through importJSON', () => {
      const G = useGraphStore()
      G.setTitle('Roundtrip')
      const parsed = JSON.parse(G.exportJSON())
      expect(parsed.title).toBe('Roundtrip')
      expect(Array.isArray(parsed.nodes)).toBe(true)
    })
  })

  describe('persistence', () => {
    it('writes to localStorage after the debounce window', async () => {
      vi.useFakeTimers()
      try {
        const G = useGraphStore()
        G.setTitle('Persisted')
        await vi.advanceTimersByTimeAsync(GRAPH_LIMITS.SAVE_DEBOUNCE_MS + 30)
        const saved = JSON.parse(localStorage.getItem('handwritten-mindmap-v1')!)
        expect(saved.title).toBe('Persisted')
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
