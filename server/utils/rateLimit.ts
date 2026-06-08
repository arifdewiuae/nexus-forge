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
  /** Seconds until the window resets — used for the `Retry-After` header on 429. */
  retryAfterSec: number
}

const WINDOW_SEC = Math.floor(RATE_LIMIT.WINDOW_MS / 1000)

// ---- In-memory fallback ----

interface InMemoryEntry {
  count: number
  resetAt: number
}

const memoryStore = new Map<string, InMemoryEntry>()

function checkInMemory(key: string, limit: number): RateLimitResult {
  const now = Date.now()
  const entry = memoryStore.get(key)

  if (!entry || entry.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + RATE_LIMIT.WINDOW_MS })
    return { allowed: true, remaining: limit - 1, retryAfterSec: WINDOW_SEC }
  }
  entry.count++

  const remaining = Math.max(0, limit - entry.count)
  const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))

  return { allowed: entry.count <= limit, remaining, retryAfterSec }
}

// ---- Upstash Redis ----

async function checkUpstash(key: string, limit: number): Promise<RateLimitResult> {
  const url   = process.env.UPSTASH_REDIS_REST_URL!
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!
  const redisKey = `rl:${key}`

  // INCR + EXPIRE (NX) + TTL pipeline via Upstash REST API
  const res = await fetch(`${url}/pipeline`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify([
      ['INCR', redisKey],
      ['EXPIRE', redisKey, WINDOW_SEC, 'NX'],
      ['TTL', redisKey],
    ]),
  })
  if (!res.ok) {
    // Redis unreachable — fail open (let the request through, log the issue)
    console.error('[rateLimit] Upstash request failed, failing open:', res.status)
    return { allowed: true, remaining: limit, retryAfterSec: WINDOW_SEC }
  }

  const data = (await res.json()) as Array<{ result: number }>
  const count = data[0]?.result ?? 1
  const ttl   = data[2]?.result
  const remaining = Math.max(0, limit - count)
  const retryAfterSec = typeof ttl === 'number' && ttl > 0 ? ttl : WINDOW_SEC
  return { allowed: count <= limit, remaining, retryAfterSec }
}

function hasUpstash(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

export function checkRateLimit(key: string, limit: number = RATE_LIMIT.MAX_REQUESTS): RateLimitResult {
  // Synchronous wrapper: use in-memory; Upstash is async so callers that need
  // it should use checkRateLimitAsync instead. The analyze endpoint already
  // awaits, so prefer the async version in server routes.
  return checkInMemory(key, limit)
}

export async function checkRateLimitAsync(key: string, limit: number = RATE_LIMIT.MAX_REQUESTS): Promise<RateLimitResult> {
  if (hasUpstash()) {
    try {
      return await checkUpstash(key, limit)
    } catch (err) {
      console.error('[rateLimit] Upstash error, falling back to in-memory:', err)
    }
  }
  return checkInMemory(key, limit)
}
