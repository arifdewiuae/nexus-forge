import type OpenAI from 'openai'
import { MindMapActionsSchema } from '~/lib/ai/schemas'
import type { MindMapAction, SerializedGraph } from '~/lib/ai/types'

const SYSTEM_PROMPT = `\
You are a mind-map improvement assistant. Given a graph analysis and node data, generate concrete improvement actions.

Return ONLY a valid JSON array. Each element must match exactly one of these shapes:
{ "kind": "add_node",      "label": "<string>", "parentId": "<existing-id>", "description": "<optional one-line explanation>" }
{ "kind": "link_nodes",    "fromId": "<existing-id>", "toId": "<existing-id>" }
{ "kind": "relabel",       "nodeId": "<existing-id>", "label": "<new label string>" }
{ "kind": "highlight",     "nodeIds": ["<id>", ...], "reason": "<one sentence why these nodes need attention>" }
{ "kind": "expand_branch", "parentId": "<existing-id>", "children": [{ "label": "<string>", "description": "<optional>" }] }
{ "kind": "tidy_layout" }

Rules:
- Only reference IDs that actually appear in the graph JSON
- Generate 3–6 suggestions total
- "add_node": use to fill obvious gaps — a concept that clearly belongs but is missing
- "link_nodes": use when two nodes have a real relationship that isn't reflected by parent/child
- "relabel": use only when a label is genuinely vague ("stuff", "things", "node 3")
- "highlight": use to flag orphaned nodes, circular dependencies, or "chaos blockers" — things blocking progress
- "expand_branch": use to generate a useful subtree when a node is suspiciously empty
- "tidy_layout": use when the graph looks spatially cluttered or nodes are overlapping — triggers an automatic radial re-layout
- Return ONLY the JSON array — no prose, no markdown fences, no explanation`

function extractActions(raw: string): MindMapAction[] {
  const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
  const parsed = MindMapActionsSchema.safeParse(
    (() => {
      try { return JSON.parse(cleaned) } catch { return null }
    })()
  )
  if (!parsed.success) {
    console.warn('[suggester] Could not parse or validate actions:', parsed.error.issues.slice(0, 3), cleaned.slice(0, 200))
    return []
  }
  return parsed.data
}

export interface SuggesterResult {
  actions: MindMapAction[]
  inputTokens: number
  outputTokens: number
}

export async function runSuggesterNode(
  client: OpenAI,
  graph: SerializedGraph,
  analysis: string,
  model: string,
  maxTokens: number,
  temperature: number,
  signal?: AbortSignal,
  onChunk?: (text: string) => void,
): Promise<SuggesterResult> {
  const stream = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature,
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Graph nodes:\n${JSON.stringify(graph.nodes)}\n\nAnalysis:\n${analysis}\n\nGenerate actions:`,
      },
    ],
  }, { signal })

  let raw = ''
  let inputTokens = 0
  let outputTokens = 0

  for await (const chunk of stream) {
    signal?.throwIfAborted()
    const text = chunk.choices[0]?.delta?.content ?? ''
    if (text) {
      raw += text
      onChunk?.(text)
    }
    if (chunk.usage) {
      inputTokens  = chunk.usage.prompt_tokens     ?? 0
      outputTokens = chunk.usage.completion_tokens ?? 0
    }
  }

  return {
    actions: extractActions(raw),
    inputTokens,
    outputTokens,
  }
}
