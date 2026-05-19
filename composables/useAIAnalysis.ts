import type { BoardStreamEvent } from '~/lib/ai/types'
import { serializeGraph } from '~/lib/mindmap/serializer'
import { HEADER_FIREWORKS_KEY } from '~/lib/config'
import { useApiKeys } from '~/composables/useApiKeys'

export function useAIAnalysis(onKeyRequired?: () => void) {
  const store = useMindMapStore()
  const abortController = ref<AbortController | null>(null)
  const { fireworksKey } = useApiKeys()

  function abort(): void {
    abortController.value?.abort()
    abortController.value = null
  }

  async function analyze(): Promise<void> {
    abort()

    const controller = new AbortController()
    abortController.value = controller
    store.isAnalyzing = true
    store.clearAnalysis()

    try {
      const graph = serializeGraph(store.nodes, store.title, store.crossLinks)

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (fireworksKey.value) headers[HEADER_FIREWORKS_KEY] = fireworksKey.value

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify({ graph, agent: store.activeAgent, userPrompt: store.userPrompt }),
        signal: controller.signal,
      })

      if (response.status === 401) { onKeyRequired?.(); return }
      if (!response.ok) throw new Error(`Server error ${response.status}`)
      if (!response.body)  throw new Error('No response body')

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

          if (event.type === 'thinking')   store.appendThinking(event.text)
          if (event.type === 'suggestion') store.addSuggestion(event.action)
          if (event.type === 'done') {
            store.analysisResult = {
              thinking:   store.streamingThinking,
              suggestions: store.suggestions,
              tokensUsed: event.tokens,
              costUsd:    event.costUsd,
              latencyMs:  event.latencyMs,
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

  return { analyze, abort }
}
