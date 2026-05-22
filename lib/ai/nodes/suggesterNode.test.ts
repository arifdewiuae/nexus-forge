import { describe, it, expect, vi } from 'vitest'
import { runSuggesterNode } from './suggesterNode'
import type { SerializedGraph } from '~/lib/ai/types'

const GRAPH: SerializedGraph = {
  title: 'Test',
  nodeCount: 1,
  nodes: [{ id: 'root', label: 'Root', parentId: null, childCount: 0, level: 0, x: 0, y: 0 }],
}

function makeStream(chunks: string[]) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const text of chunks) {
        yield { choices: [{ delta: { content: text } }], usage: null }
      }
      yield { choices: [{ delta: { content: '' } }], usage: { prompt_tokens: 30, completion_tokens: 60 } }
    },
  }
}

function mockClient(chunks: string[]) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue(makeStream(chunks)),
      },
    },
  } as unknown as import('openai').default
}

const VALID_ACTIONS = JSON.stringify([
  { kind: 'add_node', label: 'New Node', parentId: 'root' },
  { kind: 'tidy_layout' },
])

describe('runSuggesterNode', () => {
  it('parses valid fenced JSON actions', async () => {
    const client = mockClient(['```json\n', VALID_ACTIONS, '\n```'])
    const result = await runSuggesterNode(client, GRAPH, 'analysis', 'model', 100, 0.3)
    expect(result.actions).toHaveLength(2)
    expect(result.actions[0]?.kind).toBe('add_node')
    expect(result.actions[1]?.kind).toBe('tidy_layout')
  })

  it('parses valid unfenced JSON', async () => {
    const client = mockClient([VALID_ACTIONS])
    const result = await runSuggesterNode(client, GRAPH, 'analysis', 'model', 100, 0.3)
    expect(result.actions).toHaveLength(2)
  })

  it('rejects unknown action kinds and returns empty array', async () => {
    const client = mockClient([JSON.stringify([{ kind: 'unknown_action', foo: 'bar' }])])
    const result = await runSuggesterNode(client, GRAPH, 'analysis', 'model', 100, 0.3)
    expect(result.actions).toHaveLength(0)
  })

  it('returns empty array for invalid JSON', async () => {
    const client = mockClient(['not json at all'])
    const result = await runSuggesterNode(client, GRAPH, 'analysis', 'model', 100, 0.3)
    expect(result.actions).toHaveLength(0)
  })

  it('reports token usage', async () => {
    const client = mockClient([VALID_ACTIONS])
    const result = await runSuggesterNode(client, GRAPH, 'analysis', 'model', 100, 0.3)
    expect(result.inputTokens).toBe(30)
    expect(result.outputTokens).toBe(60)
  })

  it('calls onChunk with each streaming token', async () => {
    const tokens = ['[', '{"kind":"tidy_layout"}', ']']
    const client = mockClient(tokens)
    const received: string[] = []
    await runSuggesterNode(client, GRAPH, 'analysis', 'model', 100, 0.3, undefined, (t) => received.push(t))
    expect(received).toEqual(tokens)
  })
})
