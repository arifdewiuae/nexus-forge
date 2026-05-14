// SSE event discriminated union — no magic strings at call sites
export type BoardStreamEvent =
  | { type: 'thinking'; text: string }
  | { type: 'suggestion'; action: BoardAction }
  | { type: 'done'; latencyMs: number; tokens: number; costUsd: number }
  | { type: 'error'; message: string }

// Every action the AI can suggest on the canvas
export type BoardAction =
  | { kind: 'move'; objectId: string; x: number; y: number }
  | { kind: 'group'; objectIds: string[]; label: string; x: number; y: number }
  | { kind: 'label'; objectId: string; text: string }
  | { kind: 'recolor'; objectId: string; fill: string }
  | { kind: 'connect'; fromId: string; toId: string }

// Serialized representation of a single canvas object for LLM consumption
export interface SerializedObject {
  id: string
  type: 'rect' | 'ellipse' | 'text' | 'sticky' | 'arrow' | 'freehand' | 'group' | 'unknown'
  x: number
  y: number
  width: number
  height: number
  text?: string
  fill?: string
  stroke?: string
  children?: string[]
}

export interface SerializedBoard {
  boardId: string
  objectCount: number
  objects: SerializedObject[]
  timestamp: string
}

// Presence info for a collaborating user
export interface PresenceUser {
  clientId: number
  color: string
  cursor?: { x: number; y: number }
  name: string
}

export interface AnalysisResult {
  thinking: string
  suggestions: BoardAction[]
  tokensUsed: number
  costUsd: number
  latencyMs: number
}
