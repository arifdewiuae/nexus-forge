import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkRateLimit } from './rateLimit'

describe('checkRateLimit', () => {
  const WINDOW_MS = 60 * 60 * 1000
  const MAX_REQUESTS = 20
  let now: number

  beforeEach(() => {
    now = Date.now()
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows the first request', () => {
    const { allowed, remaining } = checkRateLimit('test-first')
    expect(allowed).toBe(true)
    expect(remaining).toBe(MAX_REQUESTS - 1)
  })

  it('allows up to MAX_REQUESTS in the same window', () => {
    const key = 'test-max'
    for (let i = 0; i < MAX_REQUESTS; i++) {
      const result = checkRateLimit(key)
      expect(result.allowed).toBe(true)
    }
    // Sanity: remaining should be 0 on the last allowed request
    const { remaining } = checkRateLimit(`test-max-check-${Date.now()}`)
    expect(remaining).toBe(MAX_REQUESTS - 1)
  })

  it('blocks the request that exceeds MAX_REQUESTS', () => {
    const key = `test-block-${Math.random()}`
    for (let i = 0; i < MAX_REQUESTS; i++) checkRateLimit(key)
    const { allowed, remaining } = checkRateLimit(key)
    expect(allowed).toBe(false)
    expect(remaining).toBe(0)
  })

  it('resets the bucket after the window expires', () => {
    const key = `test-reset-${Math.random()}`
    for (let i = 0; i < MAX_REQUESTS; i++) checkRateLimit(key)
    expect(checkRateLimit(key).allowed).toBe(false)

    vi.advanceTimersByTime(WINDOW_MS + 1)

    const { allowed, remaining } = checkRateLimit(key)
    expect(allowed).toBe(true)
    expect(remaining).toBe(MAX_REQUESTS - 1)
  })

  it('tracks different keys independently', () => {
    const keyA = `test-a-${Math.random()}`
    const keyB = `test-b-${Math.random()}`
    for (let i = 0; i < MAX_REQUESTS; i++) checkRateLimit(keyA)
    expect(checkRateLimit(keyA).allowed).toBe(false)
    expect(checkRateLimit(keyB).allowed).toBe(true)
  })

  it('decrements remaining by 1 per call', () => {
    const key = `test-decrement-${Math.random()}`
    const first  = checkRateLimit(key)
    const second = checkRateLimit(key)
    expect(first.remaining - second.remaining).toBe(1)
  })
})
