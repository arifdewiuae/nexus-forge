export const AI_CONFIG = {
  MODEL_ID: 'accounts/fireworks/models/minimax-m2p7',
  BASE_URL: 'https://api.fireworks.ai/inference/v1',
  MAX_TOKENS: 2048,
  TEMPERATURE: 0.3,
} as const

export const AI_PRICING = {
  INPUT_PER_MILLION:  0.60,
  OUTPUT_PER_MILLION: 0.60,
} as const

export const RATE_LIMIT = {
  /** Per-session/hour budget for the shared demo key (tighter — it's our spend). */
  DEMO_MAX_REQUESTS: 20,
  /** Per-session/hour budget when the user brings their own key (looser). */
  OWN_MAX_REQUESTS: 100,
  /** Default limit (= demo tier) used by the synchronous/legacy entry points. */
  MAX_REQUESTS: 20,
  WINDOW_MS: 60 * 60 * 1000,
} as const

export const HEADER_FIREWORKS_KEY = 'x-fireworks-key'
export const STORAGE_KEY_API_KEYS = 'nf:api-keys'

/**
 * Security headers applied to every response (server/middleware/securityHeaders.ts).
 * Mirrored in vercel.json so Vercel's CDN sets them on static assets too — keep the
 * two in sync. CSP allows the Google Fonts origins used by assets/css/globals.css;
 * `microphone=(self)` is required for the in-app voice input (useSpeechRecognition).
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
}
