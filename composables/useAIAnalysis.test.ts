// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import type { BoardStreamEvent } from '~/lib/ai/types'

// Mock Vue lifecycle hooks at top level so onUnmounted is a no-op outside components
vi.mock('vue', async (importActual) => {
  const actual = await importActual<typeof import('vue')>()
  return { ...actual, onUnmounted: vi.fn() }
})

/**
 * Helper that encodes a list of BoardStreamEvents into a mock SSE ReadableStream.
 */
function makeSseStream(events: BoardStreamEvent[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const evt of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`))
      }
      controller.close()
    },
  })
}

/**
 * Lightweight reducer that mirrors useAIAnalysis event handling.
 * Tested in isolation so the full composable doesn't need to boot.
 */
function runReducer(events: BoardStreamEvent[]) {
  const thinking:    string[]       = []
  const suggestions: unknown[]      = []
  let   result:      unknown | null = null
  let   error:       string | null  = null

  for (const event of events) {
    if (event.type === 'thinking')   thinking.push(event.text)
    if (event.type === 'suggestion') suggestions.push(event.action)
    if (event.type === 'done')       result = { tokensUsed: event.tokens, costUsd: event.costUsd, latencyMs: event.latencyMs }
    if (event.type === 'error')      error = event.message
  }

  return { thinking: thinking.join(''), suggestions, result, error }
}

describe('SSE event reducer', () => {
  it('accumulates thinking chunks in order', () => {
    const events: BoardStreamEvent[] = [
      { type: 'thinking', text: 'Part 1 ' },
      { type: 'thinking', text: 'Part 2' },
    ]
    const { thinking } = runReducer(events)
    expect(thinking).toBe('Part 1 Part 2')
  })

  it('collects suggestions', () => {
    const events: BoardStreamEvent[] = [
      { type: 'suggestion', action: { kind: 'tidy_layout' } },
      { type: 'suggestion', action: { kind: 'tidy_layout' } },
    ]
    const { suggestions } = runReducer(events)
    expect(suggestions).toHaveLength(2)
  })

  it('finalises result on done event', () => {
    const events: BoardStreamEvent[] = [
      { type: 'done', latencyMs: 1200, tokens: 300, costUsd: 0.0002 },
    ]
    const { result } = runReducer(events)
    expect(result).toMatchObject({ tokensUsed: 300, costUsd: 0.0002, latencyMs: 1200 })
  })

  it('captures error message', () => {
    const events: BoardStreamEvent[] = [
      { type: 'error', message: 'Something went wrong' },
    ]
    const { error } = runReducer(events)
    expect(error).toBe('Something went wrong')
  })

  it('processes a full thinking → suggestion → done sequence', () => {
    const events: BoardStreamEvent[] = [
      { type: 'thinking', text: 'Analysis...' },
      { type: 'suggestion', action: { kind: 'add_node', label: 'New Node', parentId: 'root' } },
      { type: 'done', latencyMs: 800, tokens: 200, costUsd: 0.00012 },
    ]
    const { thinking, suggestions, result } = runReducer(events)
    expect(thinking).toBe('Analysis...')
    expect(suggestions).toHaveLength(1)
    expect(result).toBeTruthy()
  })
})

describe('useAIAnalysis – 401 path', () => {
  it('calls onKeyRequired when fetch returns 401', async () => {
    // Stub Nuxt / Vue globals before importing the composable
    vi.stubGlobal('useRuntimeConfig', () => ({ public: {} }))
    vi.stubGlobal('useMindMapStore', () => ({
      isAnalyzing: false,
      clearAnalysis: vi.fn(),
      appendThinking: vi.fn(),
      addSuggestion: vi.fn(),
      streamingThinking: '',
      suggestions: [],
      analysisResult: null,
      nodes: [],
      title: 'test',
      crossLinks: [],
      activeAgent: null,
      userPrompt: '',
    }))

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 401, body: null,
      headers: new Headers(),
    }))

    const { useAIAnalysis } = await import('./useAIAnalysis')
    const onKeyRequired = vi.fn()
    const { analyze } = useAIAnalysis(onKeyRequired)
    await analyze()
    expect(onKeyRequired).toHaveBeenCalled()
  })
})
