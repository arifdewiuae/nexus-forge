import type OpenAI from 'openai'
import type { SerializedGraph, AgentPersona } from '~/lib/ai/types'

const BASE_SYSTEM = `\
You are analyzing a handwritten mind map. Given a JSON snapshot of the graph, write a focused, opinionated analysis that helps the user understand and improve their thinking.

Structure your response with these sections (use **bold** for headers):

**What this is about** — One sentence: what central idea or problem does this map explore?
**Structure & gaps** — Which nodes are isolated (no children, no parent except root)? Which branches are suspiciously thin or dense? Name specific labels.
**Hidden connections** — Spot 1–2 nodes that should be linked but aren't.
**Next moves** — The 2–3 highest-leverage actions: add a missing node, rename a vague label, connect two related nodes.

Be specific. Name actual node labels. No generic advice. 4 paragraphs max.`

export interface AnalyzerResult {
  analysis: string
  inputTokens: number
  outputTokens: number
}

export async function runAnalyzerNode(
  client: OpenAI,
  graph: SerializedGraph,
  agent: AgentPersona | null,
  userPrompt: string,
  onChunk: (text: string) => void,
  model: string,
  maxTokens: number,
  temperature: number,
): Promise<AnalyzerResult> {
  const systemPrompt = agent
    ? `You are ${agent.name}. ${agent.personality}\n\n${BASE_SYSTEM}\n\nVoice rules: ${agent.voiceRules}`
    : BASE_SYSTEM

  const promptContext = userPrompt.trim()
    ? `The user shared these thoughts:\n"${userPrompt.trim()}"\n\nUse this as the primary context for your analysis. If the map is sparse or empty, suggest nodes and structure that reflect what the user described.\n\n`
    : ''

  const mapDescription = graph.nodeCount > 0
    ? `Analyze this mind map titled "${graph.title}" with ${graph.nodeCount} nodes:\n\n${JSON.stringify(graph.nodes, null, 2)}`
    : `The mind map is currently empty (just a root titled "${graph.title}"). Base your suggestions entirely on the user's thoughts above.`

  const stream = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature,
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `${promptContext}${mapDescription}`,
      },
    ],
  })

  let analysis = ''
  let inputTokens = 0
  let outputTokens = 0

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? ''
    if (text) { analysis += text; onChunk(text) }
    if (chunk.usage) {
      inputTokens  = chunk.usage.prompt_tokens     ?? 0
      outputTokens = chunk.usage.completion_tokens ?? 0
    }
  }

  return { analysis, inputTokens, outputTokens }
}
