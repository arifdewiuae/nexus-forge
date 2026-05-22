import { describe, it, expect, vi } from 'vitest'
import { runAnalyzerNode } from './analyzerNode'
import type { SerializedGraph, AgentPersona } from '~/lib/ai/types'

const GRAPH: SerializedGraph = {
  title: 'Test',
  nodeCount: 1,
  nodes: [{ id: 'root', label: 'Root', parentId: null, childCount: 0, level: 0, x: 0, y: 0 }],
}
const AGENT: AgentPersona = {
  id:          'axiom9',
  name:        'AXIOM-9',
  tagline:     'Cold analyst',
  personality: 'analytical',
  voiceRules:  'Be precise',
  accentColor: '#3a6a8a',
}

function makeChunkStream(chunks: string[]) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const text of chunks) {
        yield {
          choices: [{ delta: { content: text } }],
          usage: null,
        }
      }
      yield { choices: [{ delta: { content: '' } }], usage: { prompt_tokens: 50, completion_tokens: 20 } }
    },
  }
}

function mockOpenAIClient(chunks: string[]) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue(makeChunkStream(chunks)),
      },
    },
  } as unknown as import('openai').default
}

describe('runAnalyzerNode', () => {
  it('emits each streaming chunk to onChunk callback', async () => {
    const chunks = ['Hello ', 'world', '!']
    const client = mockOpenAIClient(chunks)
    const received: string[] = []
    await runAnalyzerNode(client, GRAPH, AGENT, '', (t) => received.push(t), 'model', 100, 0.3)
    expect(received).toEqual(chunks)
  })

  it('accumulates full analysis text', async () => {
    const client = mockOpenAIClient(['Part1 ', 'Part2'])
    let full = ''
    const result = await runAnalyzerNode(client, GRAPH, AGENT, '', (t) => { full += t }, 'model', 100, 0.3)
    expect(result.analysis).toBe('Part1 Part2')
    expect(full).toBe('Part1 Part2')
  })

  it('reports token usage from final chunk', async () => {
    const client = mockOpenAIClient(['response'])
    const result = await runAnalyzerNode(client, GRAPH, AGENT, 'prompt', () => {}, 'model', 100, 0.3)
    expect(result.inputTokens).toBe(50)
    expect(result.outputTokens).toBe(20)
  })

  it('honours abort signal', async () => {
    const controller = new AbortController()
    const client = {
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' })),
        },
      },
    } as unknown as import('openai').default
    controller.abort()
    await expect(
      runAnalyzerNode(client, GRAPH, null, '', () => {}, 'model', 100, 0.3, controller.signal)
    ).rejects.toThrow()
  })
})
