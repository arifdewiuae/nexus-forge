import { describe, it, expect } from 'vitest'
import { computeRadialLayout } from './layout'
import type { MindMapNode } from '~/lib/ai/types'

const node = (id: string, parent: string | null = null): MindMapNode =>
  ({ id, label: id, parent, x: 0, y: 0 })

describe('computeRadialLayout', () => {
  it('returns empty array for empty input', () => {
    expect(computeRadialLayout([])).toEqual([])
  })

  it('places single root at origin', () => {
    const result = computeRadialLayout([node('root')])
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ id: 'root', x: 0, y: 0 })
  })

  it('places all nodes at origin when no root found', () => {
    const nodes = [node('a', 'b'), node('b', 'a')]
    const result = computeRadialLayout(nodes)
    result.forEach(p => { expect(p.x).toBe(0); expect(p.y).toBe(0) })
  })

  it('always returns a position for every node', () => {
    const nodes = [node('r'), node('a', 'r'), node('b', 'r'), node('c', 'a')]
    const result = computeRadialLayout(nodes)
    expect(result).toHaveLength(4)
    const ids = result.map(p => p.id).sort()
    expect(ids).toEqual(['a', 'b', 'c', 'r'])
  })

  it('root stays at 0,0 regardless of tree size', () => {
    const nodes = [node('r'), node('a', 'r'), node('b', 'r'), node('c', 'b'), node('d', 'b')]
    const result = computeRadialLayout(nodes)
    const root = result.find(p => p.id === 'r')!
    expect(root.x).toBe(0)
    expect(root.y).toBe(0)
  })

  it('children are placed at roughly the level-1 radius (~420)', () => {
    const nodes = [node('r'), node('a', 'r'), node('b', 'r')]
    const result = computeRadialLayout(nodes)
    for (const child of result.filter(p => p.id !== 'r')) {
      const dist = Math.sqrt(child.x ** 2 + child.y ** 2)
      expect(dist).toBeGreaterThan(300)
      expect(dist).toBeLessThanOrEqual(430)
    }
  })

  it('children of the same parent get distinct positions', () => {
    const nodes = [node('r'), node('a', 'r'), node('b', 'r'), node('c', 'r')]
    const result = computeRadialLayout(nodes)
    const children = result.filter(p => p.id !== 'r')
    const positions = children.map(p => `${p.x},${p.y}`)
    expect(new Set(positions).size).toBe(children.length)
  })
})
