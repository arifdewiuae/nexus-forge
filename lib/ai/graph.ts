import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import OpenAI from 'openai'
import { AI_CONFIG, AI_PRICING } from '~/lib/config'
import { runAnalyzerNode } from './nodes/analyzerNode'
import { runSuggesterNode } from './nodes/suggesterNode'
import type { BoardAction, BoardStreamEvent, SerializedBoard } from '~/lib/ai/types'

// ── State ───────────────────────────────────────────────────────────────────

const GraphState = Annotation.Root({
  boardJson:   Annotation<SerializedBoard>(),
  analysis:    Annotation<string>(),
  actions:     Annotation<BoardAction[]>(),
  inputTokens: Annotation<number>(),
  outputTokens: Annotation<number>(),
})

type BoardGraphState = typeof GraphState.State

// ── Graph factory ───────────────────────────────────────────────────────────

export interface StreamCallbacks {
  emit: (event: BoardStreamEvent) => void
}

export function createBoardGraph(apiKey: string, callbacks: StreamCallbacks) {
  const client = new OpenAI({
    apiKey,
    baseURL: AI_CONFIG.BASE_URL,
  })

  async function analyzerNode(state: BoardGraphState): Promise<Partial<BoardGraphState>> {
    const result = await runAnalyzerNode(
      client,
      state.boardJson,
      (text) => callbacks.emit({ type: 'thinking', text }),
      AI_CONFIG.MODEL_ID,
      AI_CONFIG.MAX_TOKENS,
      AI_CONFIG.TEMPERATURE,
    )
    return {
      analysis:     result.analysis,
      inputTokens:  (state.inputTokens  ?? 0) + result.inputTokens,
      outputTokens: (state.outputTokens ?? 0) + result.outputTokens,
    }
  }

  async function suggesterNode(state: BoardGraphState): Promise<Partial<BoardGraphState>> {
    // Signal the UI that we're moving into the suggestion phase
    callbacks.emit({ type: 'thinking', text: '\n\n---\n*Generating suggestions…*\n' })

    const result = await runSuggesterNode(
      client,
      state.boardJson,
      state.analysis,
      AI_CONFIG.MODEL_ID,
      Math.floor(AI_CONFIG.MAX_TOKENS / 2),
      AI_CONFIG.TEMPERATURE,
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

// ── Runner ──────────────────────────────────────────────────────────────────

export async function runBoardAnalysis(
  boardJson: SerializedBoard,
  apiKey: string,
  emit: (event: BoardStreamEvent) => void,
): Promise<void> {
  const graph = createBoardGraph(apiKey, { emit })
  const startedAt = Date.now()

  const finalState = await graph.invoke({
    boardJson,
    analysis:     '',
    actions:      [],
    inputTokens:  0,
    outputTokens: 0,
  })

  const totalTokens  = (finalState.inputTokens ?? 0) + (finalState.outputTokens ?? 0)
  const costUsd =
    ((finalState.inputTokens  ?? 0) * AI_PRICING.INPUT_PER_MILLION +
     (finalState.outputTokens ?? 0) * AI_PRICING.OUTPUT_PER_MILLION) / 1_000_000

  emit({
    type: 'done',
    latencyMs: Date.now() - startedAt,
    tokens:    totalTokens,
    costUsd,
  })
}
