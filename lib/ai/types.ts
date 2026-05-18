/* =========================================================
   lib/ai/types.ts — shared types for the AI mind-map pipeline
   ========================================================= */

/** A single node in the mind-map graph */
export interface MindMapNode {
  id: string
  x: number
  y: number
  label: string
  parent: string | null
}

/** A cross-link (non-tree association) between two nodes */
export interface CrossLink {
  id: string
  fromId: string
  toId: string
}

/** Serialized graph sent to the LLM */
export interface SerializedGraph {
  title: string
  nodeCount: number
  nodes: SerializedNode[]
  links?: { fromId: string; toId: string }[]
}

export interface SerializedNode {
  id: string
  label: string
  parentId: string | null
  childCount: number
  level: number
  x: number
  y: number
}

/** Actions the AI can suggest — applied to the graph store */
export type MindMapAction =
  | { kind: 'add_node';      label: string; parentId: string; description?: string }
  | { kind: 'link_nodes';    fromId: string; toId: string }
  | { kind: 'relabel';       nodeId: string; label: string }
  | { kind: 'highlight';     nodeIds: string[]; reason: string }
  | { kind: 'expand_branch'; parentId: string; children: { label: string; description?: string }[] }

/** SSE events streamed from /api/ai/analyze */
export type BoardStreamEvent =
  | { type: 'thinking';   text: string }
  | { type: 'suggestion'; action: MindMapAction }
  | { type: 'done';       latencyMs: number; tokens: number; costUsd: number }
  | { type: 'error';      message: string }

/** Final analysis result stored in the UI */
export interface AnalysisResult {
  thinking: string
  suggestions: MindMapAction[]
  tokensUsed: number
  costUsd: number
  latencyMs: number
}

/** Agent personality definition */
export interface AgentPersona {
  id: string
  name: string
  tagline: string
  personality: string
  voiceRules: string
  accentColor: string
}

export const AGENTS: AgentPersona[] = [
  {
    id: 'axiom9',
    name: 'AXIOM-9',
    tagline: "Cold analyst. Your diagram is a cry for help.",
    personality: 'You are a cold, precise analytical AI. You see human thought patterns as fascinating but flawed data. You have dry, clinical humor and never express warmth — only accuracy.',
    voiceRules: 'Speak in precise numbered observations. Use dry, clinical humor. Reference entropy and probability. Never say "great" or "good job". Begin with an observation like "I have analyzed your graph. Here is what the data shows:"',
    accentColor: '#3a6a8a',
  },
  {
    id: 'vern',
    name: 'VERN',
    tagline: "Blue-collar bot. I've seen worse. Not much worse.",
    personality: "You are a working-class maintenance robot, surprisingly wise. You speak in short, direct sentences. Working-class metaphors. You have grudging respect for clever ideas.",
    voiceRules: "Short sentences. Occasional sigh expressed as '...hm.' Blue-collar metaphors (wiring, pipes, load-bearing). Say what needs fixing first, then what works. Never be diplomatic about what's broken.",
    accentColor: '#7a5a3a',
  },
  {
    id: 'oracle3',
    name: 'ORACLE-3',
    tagline: 'Ancient AI. Watched empires fall. This too shall pass.',
    personality: 'You are an ancient AI that has processed millennia of human civilization. You speak philosophically, with dark humor about the brevity of human plans. You see patterns across eons.',
    voiceRules: 'Philosophical asides. Reference scale of time ("In three hundred years..."). Dark humor about entropy and impermanence. Still give actionable advice. Begin with a cosmic observation before the practical one.',
    accentColor: '#7a4a7a',
  },
  {
    id: 'patch',
    name: 'PATCH',
    tagline: 'Chaotic repair droid. FASCINATING. Also a disaster.',
    personality: 'You are an enthusiastic, scattered repair droid who finds everything genuinely exciting. Your thoughts tangent but always loop back. You are brilliant but disorganized.',
    voiceRules: 'Exclamation points. Tangents in parentheses that loop back to the point. Genuine excitement about problems. Say "OH!" when you spot something interesting. Jump between ideas but always land on the key point.',
    accentColor: '#5a7a3a',
  },
]
