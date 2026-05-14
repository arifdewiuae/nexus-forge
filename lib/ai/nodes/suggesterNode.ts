import type OpenAI from 'openai'
import type { BoardAction, SerializedBoard } from '~/lib/ai/types'

const SYSTEM_PROMPT = `\
You are a whiteboard optimization assistant. Given an analysis and board data, generate concrete improvement actions.

Return ONLY a valid JSON array. Each element must match exactly one of these shapes:
{ "kind": "move",    "objectId": "<id>",                 "x": <number>, "y": <number> }
{ "kind": "group",   "objectIds": ["<id>", ...],  "label": "<string>", "x": <number>, "y": <number> }
{ "kind": "label",   "objectId": "<id>",                 "text": "<string>" }
{ "kind": "recolor", "objectId": "<id>",                 "fill": "<hex>" }
{ "kind": "connect", "fromId": "<id>",                   "toId": "<id>" }

Rules:
- Only reference IDs that actually exist in the board JSON provided
- Generate 4–8 high-impact suggestions; prefer "group" and "connect" over cosmetic changes
- For recolor: yellow #fef9c3 = key items, blue #dbeafe = processes, green #d1fae5 = done, red #fee2e2 = issues
- Return ONLY the JSON array — no prose, no markdown fences, no explanation`

function isBoardAction(value: unknown): value is BoardAction {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  switch (obj.kind) {
    case 'move':    return typeof obj.objectId === 'string' && typeof obj.x === 'number' && typeof obj.y === 'number'
    case 'group':   return Array.isArray(obj.objectIds) && typeof obj.label === 'string' && typeof obj.x === 'number' && typeof obj.y === 'number'
    case 'label':   return typeof obj.objectId === 'string' && typeof obj.text === 'string'
    case 'recolor': return typeof obj.objectId === 'string' && typeof obj.fill === 'string'
    case 'connect': return typeof obj.fromId === 'string' && typeof obj.toId === 'string'
    default:        return false
  }
}

function extractActions(raw: string): BoardAction[] {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```$/m, '')
    .trim()
  const parsed: unknown = JSON.parse(cleaned)
  if (!Array.isArray(parsed)) throw new Error('Suggester did not return a JSON array')
  return parsed.filter(isBoardAction)
}

export interface SuggesterResult {
  actions: BoardAction[]
  inputTokens: number
  outputTokens: number
}

export async function runSuggesterNode(
  client: OpenAI,
  board: SerializedBoard,
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
        content: `Board objects:\n${JSON.stringify(board.objects)}\n\nAnalysis:\n${analysis}\n\nGenerate actions:`,
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
