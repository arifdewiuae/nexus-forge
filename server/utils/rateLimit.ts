interface Bucket { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
const WINDOW_MS = 60 * 60 * 1000
const MAX_REQUESTS = 20

export function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  let bucket = buckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS }
    buckets.set(key, bucket)
  }

  bucket.count++
  const remaining = Math.max(0, MAX_REQUESTS - bucket.count)
  return { allowed: bucket.count <= MAX_REQUESTS, remaining }
}
