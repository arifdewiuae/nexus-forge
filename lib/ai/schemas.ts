import { z } from 'zod'
import { VALIDATION } from '~/lib/config'

// ---- Node / Graph ----

export const SerializedNodeSchema = z.object({
  id:         z.string(),
  label:      z.string(),
  parentId:   z.string().nullable(),
  childCount: z.number().int().nonnegative(),
  level:      z.number().int().nonnegative(),
  x:          z.number(),
  y:          z.number(),
})

export const SerializedGraphSchema = z.object({
  title:     z.string(),
  nodeCount: z.number().int().nonnegative(),
  nodes:     z.array(SerializedNodeSchema),
  links:     z.array(z.object({ fromId: z.string(), toId: z.string() })).optional(),
})

// ---- Agent ----

export const AgentPersonaSchema = z.object({
  id:          z.string(),
  name:        z.string(),
  tagline:     z.string(),
  personality: z.string(),
  voiceRules:  z.string(),
  accentColor: z.string(),
})

// ---- AI Actions ----

export const MindMapActionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind:        z.literal('add_node'),
    label:       z.string(),
    parentId:    z.string(),
    description: z.string().optional(),
  }),
  z.object({
    kind:   z.literal('link_nodes'),
    fromId: z.string(),
    toId:   z.string(),
  }),
  z.object({
    kind:   z.literal('relabel'),
    nodeId: z.string(),
    label:  z.string(),
  }),
  z.object({
    kind:    z.literal('highlight'),
    nodeIds: z.array(z.string()),
    reason:  z.string(),
  }),
  z.object({
    kind:     z.literal('expand_branch'),
    parentId: z.string(),
    children: z.array(z.object({
      label:       z.string(),
      description: z.string().optional(),
    })),
  }),
  z.object({ kind: z.literal('tidy_layout') }),
])

export const MindMapActionsSchema = z.array(MindMapActionSchema)

// ---- SSE Events ----

export const BoardStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('thinking'),   text: z.string() }),
  z.object({ type: z.literal('suggestion'), action: MindMapActionSchema }),
  z.object({ type: z.literal('done'),       latencyMs: z.number(), tokens: z.number(), costUsd: z.number(), truncated: z.boolean().optional() }),
  z.object({ type: z.literal('error'),      message: z.string() }),
])

// ---- API Request ----

export const AnalyzeRequestSchema = z.object({
  graph:      SerializedGraphSchema,
  agent:      AgentPersonaSchema.nullable().optional(),
  userPrompt: z.string().max(VALIDATION.PROMPT_MAX_CHARS).optional(),
})

// ---- Inferred types (single source of truth) ----
export type SerializedNode     = z.infer<typeof SerializedNodeSchema>
export type SerializedGraph    = z.infer<typeof SerializedGraphSchema>
export type AgentPersona       = z.infer<typeof AgentPersonaSchema>
export type MindMapAction      = z.infer<typeof MindMapActionSchema>
export type BoardStreamEvent   = z.infer<typeof BoardStreamEventSchema>
export type AnalyzeRequest     = z.infer<typeof AnalyzeRequestSchema>
