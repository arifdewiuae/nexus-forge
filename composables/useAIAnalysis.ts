import type { BoardStreamEvent } from '~/lib/ai/types'
import { serializeGraph } from '~/lib/mindmap/serializer'
import { readSseStream } from '~/lib/ai/sseClient'
import { HEADER_FIREWORKS_KEY, API_ROUTES } from '~/lib/config'
import { useApiKeys } from '~/composables/useApiKeys'

/** Server signals "bring your own key" with a 401. */
const HTTP_UNAUTHORIZED = 401

export function useAIAnalysis(onKeyRequired?: () => void) {
  const graphStore = useGraphStore()
  const aiStore = useAIStore()
  const abortController = ref<AbortController | null>(null)
  const { fireworksKey } = useApiKeys()

  function abort(): void {
    abortController.value?.abort()
    abortController.value = null
  }

  /** Apply one streamed event to the store. `error` throws so the caller's catch handles it. */
  function applyEvent(event: BoardStreamEvent): void {
    switch (event.type) {
      case 'thinking':
        aiStore.appendThinking(event.text)
        break
      case 'suggestion':
        aiStore.addSuggestion(event.action)
        break
      case 'done':
        aiStore.analysisResult = {
          thinking:    aiStore.streamingThinking,
          suggestions: aiStore.suggestions,
          tokensUsed:  event.tokens,
          costUsd:     event.costUsd,
          latencyMs:   event.latencyMs,
        }
        break
      case 'error':
        throw new Error(event.message)
    }
  }

  async function analyze(): Promise<void> {
    abort()

    const controller = new AbortController()
    abortController.value = controller
    aiStore.isAnalyzing = true
    aiStore.clearAnalysis()

    try {
      const graph = serializeGraph(graphStore.nodes, graphStore.title, graphStore.crossLinks)

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (fireworksKey.value) headers[HEADER_FIREWORKS_KEY] = fireworksKey.value

      const response = await fetch(API_ROUTES.analyze, {
        method: 'POST',
        headers,
        body: JSON.stringify({ graph, agent: aiStore.activeAgent, userPrompt: aiStore.userPrompt }),
        signal: controller.signal,
      })

      if (response.status === HTTP_UNAUTHORIZED) { onKeyRequired?.(); return }
      if (!response.ok) throw new Error(`Server error ${response.status}`)
      if (!response.body) throw new Error('No response body')

      for await (const event of readSseStream<BoardStreamEvent>(response.body)) {
        applyEvent(event)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      aiStore.appendThinking(`\n\n[Error: ${err instanceof Error ? err.message : 'Unknown error'}]`)
    } finally {
      aiStore.isAnalyzing = false
      abortController.value = null
    }
  }

  onUnmounted(() => abort())

  return { analyze, abort }
}
