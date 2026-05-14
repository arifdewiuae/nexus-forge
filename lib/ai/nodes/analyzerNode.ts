import type OpenAI from 'openai'
import type { SerializedBoard } from '~/lib/ai/types'

const SYSTEM_PROMPT = `\
You are an expert visual information architect specializing in collaborative whiteboards.

Given a JSON snapshot of a whiteboard (objects with positions, types, and text content), analyze:
1. **Clusters** — groups of objects that belong together by meaning or spatial proximity
2. **Orphans** — isolated objects that should be connected or labeled
3. **Missing structure** — groupings, labels, or connections that would add clarity
4. **Layout quality** — whether positions communicate priority, flow, or hierarchy
5. **Key themes** — the main topics or patterns you observe

Reference objects by their ID when useful. Be concise and specific — 3 to 5 short paragraphs max.`

export interface AnalyzerResult {
  analysis: string
  inputTokens: number
  outputTokens: number
}

export async function runAnalyzerNode(
  client: OpenAI,
  board: SerializedBoard,
  onChunk: (text: string) => void,
  model: string,
  maxTokens: number,
  temperature: number,
): Promise<AnalyzerResult> {
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
        content: `Analyze this whiteboard with ${board.objectCount} objects:\n\n${JSON.stringify(board.objects, null, 2)}`,
      },
    ],
  })

  let analysis = ''
  let inputTokens = 0
  let outputTokens = 0

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? ''
    if (text) {
      analysis += text
      onChunk(text)
    }
    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens ?? 0
      outputTokens = chunk.usage.completion_tokens ?? 0
    }
  }

  return { analysis, inputTokens, outputTokens }
}
