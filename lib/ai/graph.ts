import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import OpenAI from 'openai'
import { AI_CONFIG, AI_PRICING } from '~/lib/config'
import { runAnalyzerNode } from './nodes/analyzerNode'
import { runSuggesterNode } from './nodes/suggesterNode'
import type { MindMapAction, BoardStreamEvent, SerializedGraph, AgentPersona } from '~/lib/ai/types'

const GraphState = Annotation.Root({
  graph:        Annotation<SerializedGraph>(),
  agent:        Annotation<AgentPersona | null>(),
  userPrompt:   Annotation<string>(),
  analysis:     Annotation<string>(),
  actions:      Annotation<MindMapAction[]>(),
  inputTokens:  Annotation<number>(),
  outputTokens: Annotation<number>(),
  truncated:    Annotation<boolean>(),
})

type MindMapGraphState = typeof GraphState.State

export interface StreamCallbacks {
  emit: (event: BoardStreamEvent) => void
}

export function createMindMapGraph(apiKey: string, callbacks: StreamCallbacks, signal?: AbortSignal) {
  const client = new OpenAI({ apiKey, baseURL: AI_CONFIG.BASE_URL })

  async function analyzerNode(state: MindMapGraphState): Promise<Partial<MindMapGraphState>> {
    signal?.throwIfAborted()
    const result = await runAnalyzerNode(
      client,
      state.graph,
      state.agent,
      state.userPrompt ?? '',
      (text) => callbacks.emit({ type: 'thinking', text }),
      AI_CONFIG.MODEL_ID,
      AI_CONFIG.MAX_TOKENS,
      AI_CONFIG.TEMPERATURE,
      signal,
    )
    return {
      analysis:     result.analysis,
      inputTokens:  (state.inputTokens  ?? 0) + result.inputTokens,
      outputTokens: (state.outputTokens ?? 0) + result.outputTokens,
      truncated:    result.truncated,
    }
  }

  async function suggesterNode(state: MindMapGraphState): Promise<Partial<MindMapGraphState>> {
    signal?.throwIfAborted()
    callbacks.emit({ type: 'thinking', text: '\n\n---\n*Building suggestions…*\n' })

    const result = await runSuggesterNode(
      client,
      state.graph,
      state.analysis,
      AI_CONFIG.MODEL_ID,
      Math.floor(AI_CONFIG.MAX_TOKENS / 2),
      AI_CONFIG.TEMPERATURE,
      signal,
    )

    result.actions.forEach(action => callbacks.emit({ type: 'suggestion', action }))

    return {
      actions:      result.actions,
      inputTokens:  (state.inputTokens  ?? 0) + result.inputTokens,
      outputTokens: (state.outputTokens ?? 0) + result.outputTokens,
    }
  }

  return new StateGraph(GraphState)
    .addNode('analyzer',  analyzerNode)
    .addNode('suggester', suggesterNode)
    .addEdge(START,       'analyzer')
    .addEdge('analyzer',  'suggester')
    .addEdge('suggester', END)
    .compile()
}

export async function runMindMapAnalysis(
  graph: SerializedGraph,
  agent: AgentPersona | null,
  userPrompt: string,
  apiKey: string,
  emit: (event: BoardStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const mindMapGraph = createMindMapGraph(apiKey, { emit }, signal)
  const startedAt = Date.now()

  const finalState = await mindMapGraph.invoke({
    graph,
    agent,
    userPrompt,
    analysis:     '',
    actions:      [],
    inputTokens:  0,
    outputTokens: 0,
  })

  const costUsd =
    ((finalState.inputTokens  ?? 0) * AI_PRICING.INPUT_PER_MILLION +
     (finalState.outputTokens ?? 0) * AI_PRICING.OUTPUT_PER_MILLION) / 1_000_000

  emit({
    type: 'done',
    latencyMs: Date.now() - startedAt,
    tokens:    (finalState.inputTokens ?? 0) + (finalState.outputTokens ?? 0),
    costUsd,
    truncated: finalState.truncated ?? false,
  })
}
