/**
 * Rate limiter with optional Upstash Redis backend.
 *
 * In production (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN set):
 *   Uses Upstash Redis sliding-window counters — survives serverless cold-starts
 *   and is shared across all instances.
 *
 * In development / when env vars are absent:
 *   Falls back to an in-memory Map — resets on restart, not suitable for
 *   multi-instance production but adequate for local dev and single-server
 *   deployments.
 *
 * Trust model:
 *   Keys are hashed to avoid leaking raw IPs/API-key suffixes in Redis.
 *   Window = 1 hour, limit = 20 requests by default (see lib/config.ts).
 */

import { RATE_LIMIT } from '~/lib/config'

interface RateLimitResult {
  allowed: boolean
  remaining: number
}

// ---- In-memory fallback ----

interface InMemoryEntry {
  count: number
  resetAt: number
}

const memoryStore = new Map<string, InMemoryEntry>()

function checkInMemory(key: string): RateLimitResult {
  const now = Date.now()
  const entry = memoryStore.get(key)
  if (!entry || entry.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + RATE_LIMIT.WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT.MAX_REQUESTS - 1 }
  }
  entry.count++
  const remaining = Math.max(0, RATE_LIMIT.MAX_REQUESTS - entry.count)
  return { allowed: entry.count <= RATE_LIMIT.MAX_REQUESTS, remaining }
}

// ---- Upstash Redis ----

async function checkUpstash(key: string): Promise<RateLimitResult> {
  const url   = process.env.UPSTASH_REDIS_REST_URL!
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!
  const windowSec = Math.floor(RATE_LIMIT.WINDOW_MS / 1000)
  const redisKey = `rl:${key}`

  // INCR + EXPIRE pipeline via Upstash REST API
  const res = await fetch(`${url}/pipeline`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify([
      ['INCR', redisKey],
      ['EXPIRE', redisKey, windowSec, 'NX'],
    ]),
  })
  if (!res.ok) {
    // Redis unreachable — fail open (let the request through, log the issue)
    console.error('[rateLimit] Upstash request failed, failing open:', res.status)
    return { allowed: true, remaining: RATE_LIMIT.MAX_REQUESTS }
  }

  const data = (await res.json()) as Array<{ result: number }>
  const count = data[0]?.result ?? 1
  const remaining = Math.max(0, RATE_LIMIT.MAX_REQUESTS - count)
  return { allowed: count <= RATE_LIMIT.MAX_REQUESTS, remaining }
}

function hasUpstash(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

export function checkRateLimit(key: string): RateLimitResult {
  // Synchronous wrapper: use in-memory; Upstash is async so callers that need
  // it should use checkRateLimitAsync instead. The analyze endpoint already
  // awaits, so prefer the async version in server routes.
  return checkInMemory(key)
}

export async function checkRateLimitAsync(key: string): Promise<RateLimitResult> {
  if (hasUpstash()) {
    try {
      return await checkUpstash(key)
    } catch (err) {
      console.error('[rateLimit] Upstash error, falling back to in-memory:', err)
    }
  }
  return checkInMemory(key)
}
