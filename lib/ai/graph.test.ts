import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BoardStreamEvent, SerializedGraph } from '~/lib/ai/types'

// Mock the two LLM nodes so the graph runs without any network/OpenAI call.
vi.mock('./nodes/analyzerNode', () => ({
  runAnalyzerNode: vi.fn(async (_c, _g, _a, _p, onChunk: (t: string) => void) => {
    onChunk('analysis text')
    return { analysis: 'analysis text', inputTokens: 100, outputTokens: 40, truncated: false }
  }),
}))
vi.mock('./nodes/suggesterNode', () => ({
  runSuggesterNode: vi.fn(async () => ({
    actions: [{ kind: 'tidy_layout' }, { kind: 'add_node', label: 'n', parentId: 'root' }],
    inputTokens: 30,
    outputTokens: 10,
  })),
}))

import { runMindMapAnalysis } from './graph'
import { runAnalyzerNode } from './nodes/analyzerNode'

const GRAPH: SerializedGraph = {
  title: 'ideas',
  nodeCount: 1,
  nodes: [{ id: 'root', label: 'central', parentId: null, childCount: 0, level: 0, x: 0, y: 0 }],
}

function collect() {
  const events: BoardStreamEvent[] = []
  return { events, emit: (e: BoardStreamEvent) => events.push(e) }
}

describe('runMindMapAnalysis', () => {
  beforeEach(() => vi.clearAllMocks())

  it('streams thinking, then suggestions, then a done event', async () => {
    const { events, emit } = collect()
    await runMindMapAnalysis(GRAPH, null, '', 'fake-key', emit)

    const types = events.map(e => e.type)
    expect(types[0]).toBe('thinking')
    expect(types).toContain('suggestion')
    expect(types[types.length - 1]).toBe('done')
  })

  it('emits one suggestion event per action', async () => {
    const { events, emit } = collect()
    await runMindMapAnalysis(GRAPH, null, '', 'fake-key', emit)
    expect(events.filter(e => e.type === 'suggestion')).toHaveLength(2)
  })

  it('sums tokens across both nodes and computes cost', async () => {
    const { events, emit } = collect()
    await runMindMapAnalysis(GRAPH, null, '', 'fake-key', emit)
    const done = events.find(e => e.type === 'done')!
    expect(done).toMatchObject({ type: 'done' })
    if (done.type === 'done') {
      expect(done.tokens).toBe(100 + 40 + 30 + 10) // analyzer + suggester
      expect(done.costUsd).toBeGreaterThan(0)
      expect(done.truncated).toBe(false)
    }
  })

  it('propagates truncation from the analyzer into the done event', async () => {
    vi.mocked(runAnalyzerNode).mockImplementationOnce(async (_c, _g, _a, _p, onChunk: (t: string) => void) => {
      onChunk('clipped')
      return { analysis: 'clipped', inputTokens: 10, outputTokens: 2048, truncated: true }
    })
    const { events, emit } = collect()
    await runMindMapAnalysis(GRAPH, null, '', 'fake-key', emit)
    const done = events.find(e => e.type === 'done')!
    if (done.type === 'done') expect(done.truncated).toBe(true)
  })
})
