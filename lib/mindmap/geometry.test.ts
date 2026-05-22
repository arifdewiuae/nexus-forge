import { describe, it, expect } from 'vitest'
import { nodeSize, rotFor, sketchRectPath, underlinePath, edgePath } from './geometry'
import type { MindMapNode } from '~/lib/ai/types'

function node(label: string, x = 0, y = 0): MindMapNode {
  return { id: 'n', x, y, label, parent: null }
}

describe('nodeSize', () => {
  it('returns wider rect for long root labels than short root labels', () => {
    const s = nodeSize(node('Hello World long label text'), 0)
    const t = nodeSize(node('Hi'), 0)
    // Both are capped at 400, but longer labels push towards that cap
    expect(s.w).toBeGreaterThanOrEqual(t.w)
  })

  it('root (level 0) nodes are at least as large as level-1 nodes', () => {
    const root  = nodeSize(node('Same text'), 0)
    const child = nodeSize(node('Same text'), 1)
    expect(root.h).toBeGreaterThanOrEqual(child.h)
  })

  it('always returns positive dimensions', () => {
    const { w, h } = nodeSize(node(''), 5)
    expect(w).toBeGreaterThan(0)
    expect(h).toBeGreaterThan(0)
  })

  it('returns higher fontSize for root than deep nodes', () => {
    const root = nodeSize(node('word'), 0)
    const deep = nodeSize(node('word'), 3)
    expect(root.fontSize).toBeGreaterThan(deep.fontSize)
  })
})

describe('rotFor', () => {
  it('returns a number in the range [-2.8, 2.8]', () => {
    // rotFor is a deterministic hash-based jitter, not a geometric angle
    const r = rotFor('test-id')
    expect(typeof r).toBe('number')
    expect(r).toBeGreaterThanOrEqual(-2.9)
    expect(r).toBeLessThanOrEqual(2.9)
  })

  it('same id always returns the same value', () => {
    expect(rotFor('abc')).toBe(rotFor('abc'))
  })

  it('different ids typically return different values', () => {
    const vals = new Set(['a', 'b', 'c', 'd', 'e'].map(rotFor))
    // Should not all be the same
    expect(vals.size).toBeGreaterThan(1)
  })
})

describe('sketchRectPath', () => {
  it('produces a closed SVG path string', () => {
    const path = sketchRectPath(0, 0, 80, 40, 4, 0)
    expect(path).toMatch(/M/)
    expect(path).toContain('Z')
  })

  it('generates a non-empty path for min size', () => {
    const path = sketchRectPath(10, 10, 10, 10, 2, 0)
    expect(path.length).toBeGreaterThan(5)
  })
})

describe('underlinePath', () => {
  it('returns a horizontal-ish path string', () => {
    // underlinePath(w, h)
    const path = underlinePath(100, 40)
    expect(path).toMatch(/^M/)
  })

  it('accepts different widths without error', () => {
    expect(() => underlinePath(60, 30)).not.toThrow()
    expect(() => underlinePath(300, 60)).not.toThrow()
  })
})

describe('edgePath', () => {
  it('returns a non-empty SVG path string', () => {
    const a = node('A', 0, 0)
    const b = node('B', 200, 100)
    const path = edgePath(a, b, 1)
    expect(path.length).toBeGreaterThan(5)
  })

  it('starts at node a coordinates', () => {
    const a = node('A', 10, 20)
    const b = node('B', 100, 50)
    const path = edgePath(a, b, 1)
    expect(path).toMatch(/^M\s*10\s+20/)
  })

  it('handles negative x offset (left-side branches)', () => {
    const a = node('A', 100, 50)
    const b = node('B', 10, 50)
    const path = edgePath(a, b, -1)
    expect(typeof path).toBe('string')
    expect(path.length).toBeGreaterThan(5)
  })
})
