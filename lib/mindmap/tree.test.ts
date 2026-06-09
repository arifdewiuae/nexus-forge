import { describe, it, expect } from 'vitest'
import type { MindMapNode } from '~/lib/ai/types'
import { nodeById, rootNode, childrenOf, ancestorsOf, levelOf, descendantsOf } from './tree'

const n = (id: string, parent: string | null): MindMapNode => ({ id, x: 0, y: 0, label: id, parent })

// root → a → a1, a2 ; root → b
const nodes: MindMapNode[] = [n('root', null), n('a', 'root'), n('a1', 'a'), n('a2', 'a'), n('b', 'root')]

describe('tree traversal', () => {
  it('nodeById finds a node or returns null', () => {
    expect(nodeById(nodes, 'a1')?.id).toBe('a1')
    expect(nodeById(nodes, 'nope')).toBeNull()
  })

  it('rootNode returns the parentless node', () => {
    expect(rootNode(nodes)?.id).toBe('root')
    expect(rootNode([])).toBeNull()
  })

  it('childrenOf returns direct children only', () => {
    expect(childrenOf(nodes, 'a').map(c => c.id)).toEqual(['a1', 'a2'])
    expect(childrenOf(nodes, 'a1')).toEqual([])
  })

  it('ancestorsOf returns root → parent order, excluding self', () => {
    expect(ancestorsOf(nodes, 'a1').map(p => p.id)).toEqual(['root', 'a'])
    expect(ancestorsOf(nodes, 'root')).toEqual([])
  })

  it('levelOf is the depth from root', () => {
    expect(levelOf(nodes, 'root')).toBe(0)
    expect(levelOf(nodes, 'a')).toBe(1)
    expect(levelOf(nodes, 'a1')).toBe(2)
  })

  it('descendantsOf returns all transitive children, excluding self', () => {
    expect(descendantsOf(nodes, 'a').sort()).toEqual(['a1', 'a2'])
    expect(descendantsOf(nodes, 'root').sort()).toEqual(['a', 'a1', 'a2', 'b'])
    expect(descendantsOf(nodes, 'a1')).toEqual([])
  })
})
