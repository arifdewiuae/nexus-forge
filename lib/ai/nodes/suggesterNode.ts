import type OpenAI from 'openai'
import type { MindMapAction, SerializedGraph } from '~/lib/ai/types'

const SYSTEM_PROMPT = `\
You are a mind-map improvement assistant. Given a graph analysis and node data, generate concrete improvement actions.

Return ONLY a valid JSON array. Each element must match exactly one of these shapes:
{ "kind": "add_node",      "label": "<string>", "parentId": "<existing-id>", "description": "<optional one-line explanation>" }
{ "kind": "link_nodes",    "fromId": "<existing-id>", "toId": "<existing-id>" }
{ "kind": "relabel",       "nodeId": "<existing-id>", "label": "<new label string>" }
{ "kind": "highlight",     "nodeIds": ["<id>", ...], "reason": "<one sentence why these nodes need attention>" }
{ "kind": "expand_branch", "parentId": "<existing-id>", "children": [{ "label": "<string>", "description": "<optional>" }] }

Rules:
- Only reference IDs that actually appear in the graph JSON
- Generate 3–6 suggestions total
- "add_node": use to fill obvious gaps — a concept that clearly belongs but is missing
- "link_nodes": use when two nodes have a real relationship that isn't reflected by parent/child
- "relabel": use only when a label is genuinely vague ("stuff", "things", "node 3")
- "highlight": use to flag orphaned nodes, circular dependencies, or "chaos blockers" — things blocking progress
- "expand_branch": use to generate a useful subtree when a node is suspiciously empty
- Return ONLY the JSON array — no prose, no markdown fences, no explanation`

function isMindMapAction(value: unknown): value is MindMapAction {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  switch (obj.kind) {
    case 'add_node':      return typeof obj.label === 'string' && typeof obj.parentId === 'string'
    case 'link_nodes':    return typeof obj.fromId === 'string' && typeof obj.toId === 'string'
    case 'relabel':       return typeof obj.nodeId === 'string' && typeof obj.label === 'string'
    case 'highlight':     return Array.isArray(obj.nodeIds) && typeof obj.reason === 'string'
    case 'expand_branch': return typeof obj.parentId === 'string' && Array.isArray(obj.children)
    default:              return false
  }
}

function extractActions(raw: string): MindMapAction[] {
  const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
  try {
    const parsed: unknown = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isMindMapAction)
  } catch {
    console.warn('[suggester] Could not parse actions JSON:', cleaned.slice(0, 200))
    return []
  }
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
): Promise<SuggesterResult> {
  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature,
    stream: false,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Graph nodes:\n${JSON.stringify(graph.nodes)}\n\nAnalysis:\n${analysis}\n\nGenerate actions:`,
      },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? '[]'
  const actions = extractActions(raw)

  return {
    actions,
    inputTokens:  response.usage?.prompt_tokens     ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  }
}
