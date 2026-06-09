/**
 * Pure graph-traversal helpers over a flat MindMapNode[] (parent-pointer tree).
 * No reactivity — each function takes the node array explicitly so it can be
 * unit-tested without Pinia. The store wraps these as thin `nodes.value`-bound methods.
 */
import type { MindMapNode } from '~/lib/ai/types'
import { GRAPH_LIMITS } from '~/lib/config'

export function nodeById(nodes: MindMapNode[], id: string): MindMapNode | null {
  return nodes.find(n => n.id === id) ?? null
}

/** The single parentless node, falling back to the first node for malformed graphs. */
export function rootNode(nodes: MindMapNode[]): MindMapNode | null {
  return nodes.find(n => n.parent === null) ?? nodes[0] ?? null
}

export function childrenOf(nodes: MindMapNode[], id: string): MindMapNode[] {
  return nodes.filter(n => n.parent === id)
}

/** Ancestors from root → parent (excludes the node itself); cycle-guarded. */
export function ancestorsOf(nodes: MindMapNode[], id: string): MindMapNode[] {
  const out: MindMapNode[] = []
  let n = nodeById(nodes, id)
  let guard = 0
  while (n && n.parent && guard++ < GRAPH_LIMITS.ANCESTRY_GUARD) {
    const p = nodeById(nodes, n.parent)
    if (!p) break
    out.unshift(p)
    n = p
  }
  return out
}

/** Depth from root (root = 0). */
export function levelOf(nodes: MindMapNode[], id: string): number {
  return ancestorsOf(nodes, id).length
}

/** All transitive descendant ids of `id` (excludes `id` itself). */
export function descendantsOf(nodes: MindMapNode[], id: string): string[] {
  const set = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const n of nodes) {
      if (!set.has(n.id) && n.parent !== null && set.has(n.parent)) {
        set.add(n.id)
        grew = true
      }
    }
  }
  set.delete(id)
  return [...set]
}
