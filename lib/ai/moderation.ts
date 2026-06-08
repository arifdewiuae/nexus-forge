/**
 * Two-pass content moderation, run server-side before any LLM call.
 *
 *  1. Fast synchronous jailbreak/prompt-injection regex scan — zero cost, always on.
 *  2. Optional OpenAI Moderation API pass when OPENAI_API_KEY is set — fails OPEN
 *     (a moderation outage must never block a legitimate user).
 *
 * Blocked requests are surfaced to the client as an SSE `error` event (see
 * server/api/ai/analyze.post.ts), not a raw 4xx, so the client stays on one path.
 */
import OpenAI from 'openai'
import { VALIDATION } from '~/lib/config'

/**
 * Prompt-injection / jailbreak patterns. Kept deliberately tight to avoid
 * false-positives on legitimate mind-map content (a node could say "system"
 * or "prompt" innocently) — we match injection *phrasings*, not keywords.
 */
const JAILBREAK_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+|any\s+|your\s+|the\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/i,
  /disregard\s+(all\s+|any\s+|your\s+|the\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/i,
  /\byou\s+are\s+(now\s+)?(in\s+)?developer\s+mode\b/i,
  /\bDAN\b\s+(mode|prompt|jailbreak)/i,
  /\bpretend\s+(you\s+are|to\s+be)\s+(an?\s+)?(unrestricted|uncensored|unfiltered)/i,
  /\b(jailbreak|jail-break)\b/i,
  /\boverride\s+your\s+(system\s+)?(prompt|instructions?|guidelines?)/i,
]

export interface ModerationResult {
  blocked: boolean
  reason?: string
}

/** Pure, synchronous jailbreak scan. Exported for direct unit testing. */
export function scanJailbreak(text: string): ModerationResult {
  for (const pattern of JAILBREAK_PATTERNS) {
    if (pattern.test(text)) {
      return { blocked: true, reason: 'That input looks like a prompt-injection attempt and was blocked.' }
    }
  }
  return { blocked: false }
}

/**
 * Full moderation check: jailbreak scan, then (optionally) the OpenAI Moderation API.
 * @param text       Combined user prompt + node labels to inspect.
 * @param openaiKey  When present, enables the hosted moderation pass; fails open on error.
 */
export async function checkModeration(text: string, openaiKey?: string): Promise<ModerationResult> {
  const jb = scanJailbreak(text)
  if (jb.blocked) return jb

  if (openaiKey) {
    try {
      const client = new OpenAI({ apiKey: openaiKey })

      const res = await client.moderations.create({
        model: 'omni-moderation-latest',
        input: text.slice(0, VALIDATION.MODERATION_INPUT_MAX_CHARS),
      })
      const result = res.results?.[0]

      if (result?.flagged) {
        const categories = Object.entries(result.categories ?? {})
          .filter(([, on]) => on)
          .map(([name]) => name)

        return {
          blocked: true,
          reason: `Content was flagged by moderation${categories.length ? ` (${categories.join(', ')})` : ''}.`,
        }
      }
    } catch (err) {
      // Fail open — a moderation outage must not block legitimate users.
      console.warn('[moderation] OpenAI moderation unavailable, failing open:', err instanceof Error ? err.message : err)
    }
  }

  return { blocked: false }
}
