import type { BoardStreamEvent } from '~/lib/ai/types'
import type { SerializedBoard } from '~/lib/ai/types'

// Phase 2: SSE stream consumer for AI board analysis
export function useAIAnalysis() {
  const store = useBoardStore()
  const abortController = ref<AbortController | null>(null)

  function abort(): void {
    abortController.value?.abort()
    abortController.value = null
  }

  async function analyze(board: SerializedBoard): Promise<void> {
    abort()

    const controller = new AbortController()
    abortController.value = controller
    store.isAnalyzing = true
    store.openTracePanel()
    store.clearAnalysis()

    const startedAt = Date.now()

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardJson: board }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Server error ${response.status}`)
      }
      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()

      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += value

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw || raw === '[DONE]') continue

          const event = JSON.parse(raw) as BoardStreamEvent

          if (event.type === 'thinking') store.appendThinking(event.text)
          if (event.type === 'suggestion') store.addSuggestion(event.action)
          if (event.type === 'done') {
            store.analysisResult = {
              thinking: store.streamingThinking,
              suggestions: store.suggestions,
              tokensUsed: event.tokens,
              costUsd: event.costUsd,
              latencyMs: event.latencyMs,
            }
          }
          if (event.type === 'error') throw new Error(event.message)
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      store.appendThinking(`\n\n[Error: ${err instanceof Error ? err.message : 'Unknown error'}]`)
    } finally {
      store.isAnalyzing = false
      abortController.value = null
    }
  }

  onUnmounted(() => abort())

  return { analyze, abort, elapsedMs: computed(() => Date.now()) }
}
