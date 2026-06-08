import { describe, it, expect } from 'vitest'
import {
  AnalyzeRequestSchema,
  MindMapActionSchema,
  BoardStreamEventSchema,
  SerializedGraphSchema,
} from './schemas'

const VALID_GRAPH = {
  title: 'ideas',
  nodeCount: 1,
  nodes: [{ id: 'root', label: 'central', parentId: null, childCount: 0, level: 0, x: 0, y: 0 }],
}

describe('AnalyzeRequestSchema', () => {
  it('accepts a minimal valid request', () => {
    const r = AnalyzeRequestSchema.safeParse({ graph: VALID_GRAPH })
    expect(r.success).toBe(true)
  })

  it('accepts an optional agent and userPrompt', () => {
    const r = AnalyzeRequestSchema.safeParse({
      graph: VALID_GRAPH,
      agent: { id: 'a', name: 'A', tagline: 't', personality: 'p', voiceRules: 'v', accentColor: '#000' },
      userPrompt: 'help me',
    })
    expect(r.success).toBe(true)
  })

  it('rejects a userPrompt over the 2000-char cap', () => {
    const r = AnalyzeRequestSchema.safeParse({ graph: VALID_GRAPH, userPrompt: 'x'.repeat(2001) })
    expect(r.success).toBe(false)
  })

  it('accepts a userPrompt exactly at the 2000-char cap', () => {
    const r = AnalyzeRequestSchema.safeParse({ graph: VALID_GRAPH, userPrompt: 'x'.repeat(2000) })
    expect(r.success).toBe(true)
  })

  it('rejects a missing graph', () => {
    expect(AnalyzeRequestSchema.safeParse({ userPrompt: 'hi' }).success).toBe(false)
  })

  it('rejects a graph node missing required fields', () => {
    const bad = { title: 't', nodeCount: 1, nodes: [{ id: 'x', label: 'y' }] }
    expect(SerializedGraphSchema.safeParse(bad).success).toBe(false)
  })
})

describe('MindMapActionSchema (discriminated union)', () => {
  it('accepts each action kind', () => {
    const actions = [
      { kind: 'add_node', label: 'n', parentId: 'root' },
      { kind: 'link_nodes', fromId: 'a', toId: 'b' },
      { kind: 'relabel', nodeId: 'a', label: 'x' },
      { kind: 'highlight', nodeIds: ['a'], reason: 'r' },
      { kind: 'expand_branch', parentId: 'root', children: [{ label: 'c' }] },
      { kind: 'tidy_layout' },
    ]
    for (const a of actions) expect(MindMapActionSchema.safeParse(a).success).toBe(true)
  })

  it('rejects an unknown kind', () => {
    expect(MindMapActionSchema.safeParse({ kind: 'frobnicate' }).success).toBe(false)
  })

  it('rejects add_node without a parentId', () => {
    expect(MindMapActionSchema.safeParse({ kind: 'add_node', label: 'n' }).success).toBe(false)
  })
})

describe('BoardStreamEventSchema', () => {
  it('accepts a done event with the optional truncated flag', () => {
    expect(BoardStreamEventSchema.safeParse({
      type: 'done', latencyMs: 1, tokens: 2, costUsd: 0.1, truncated: true,
    }).success).toBe(true)
  })

  it('accepts a done event without truncated (optional)', () => {
    expect(BoardStreamEventSchema.safeParse({
      type: 'done', latencyMs: 1, tokens: 2, costUsd: 0.1,
    }).success).toBe(true)
  })

  it('rejects an unknown event type', () => {
    expect(BoardStreamEventSchema.safeParse({ type: 'nope' }).success).toBe(false)
  })
})
