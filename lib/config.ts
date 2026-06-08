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

/** Request-validation caps applied server-side before the LLM runs. */
export const VALIDATION = {
  /** Hard cap on the raw JSON request body (server/api/ai/analyze.post.ts). */
  PAYLOAD_MAX_BYTES: 50_000,
  /** Max length of the free-text user prompt (lib/ai/schemas.ts). */
  PROMPT_MAX_CHARS: 2000,
  /** Text sent to the moderation API is truncated to this (lib/ai/moderation.ts). */
  MODERATION_INPUT_MAX_CHARS: 4000,
  /** How many trailing chars of an API key identify a rate-limit bucket. */
  RATE_LIMIT_KEY_SUFFIX_LEN: 8,
} as const

/** Graph state: history depth, recursion guards, and field caps. */
export const GRAPH_LIMITS = {
  /** Max undo/redo snapshots retained (stores/useGraphStore.ts). */
  HISTORY_LIMIT: 80,
  /** First id assigned to user-created nodes in the seed/fresh board. */
  SEED_NEXT_ID: 100,
  /** Safety bound when walking ancestors (cycle guard). */
  ANCESTRY_GUARD: 50,
  /** Safety bound when checking a reparent for cycles. */
  REPARENT_GUARD: 100,
  /** Max characters kept for a node label. */
  LABEL_MAX_CHARS: 200,
  /** Max characters kept for the board title. */
  TITLE_MAX_CHARS: 80,
  /** Debounce before persisting the board to localStorage (ms). */
  SAVE_DEBOUNCE_MS: 220,
} as const

/** New-child placement scan around a parent (useGraphStore.addChild). */
export const PLACEMENT = {
  /** Distance from the parent at which a new child is dropped (px). */
  CHILD_RADIUS: 200,
  /** Angular step of the empty-slot scan (degrees). */
  ANGLE_STEP_DEG: 12,
  /** Full sweep of the scan (degrees). */
  FULL_CIRCLE_DEG: 360,
} as const

/** How long an AI `highlight` pulse stays on before auto-clearing (ms). */
export const HIGHLIGHT_CLEAR_MS = 4000

/** Radial auto-layout tuning (lib/mindmap/layout.ts). */
export const LAYOUT = {
  /** Ring radius per depth level; deeper levels fall back to FALLBACK_RADIUS. */
  RADII: [0, 420, 300, 210, 155, 120],
  /** Radius used for levels beyond RADII. */
  FALLBACK_RADIUS: 100,
  /** Fraction of each sector left as margin so deep nodes don't crowd. */
  SECTOR_MARGIN_FRAC: 0.08,
} as const

/**
 * Node rendering geometry (lib/mindmap/geometry.ts).
 * Size tiers by depth: ROOT (level 0), BRANCH (level 1), LEAF (level 2+).
 * Width  = clamp(wMin, wMax, len * wPerChar + wPad).
 * Font   = clamp(fontMin, fontMax, (w - fontPad) / (len * CHAR_W)).
 */
export const GEOMETRY = {
  /** Approx. character-width ratio for the Kalam/Caveat handwriting fonts. */
  CHAR_W: 0.52,
  ROOT:   { wMin: 240, wMax: 400, wPerChar: 14, wPad: 60, fontMin: 18, fontMax: 42, fontPad: 40, h: 96, radius: 30 },
  BRANCH: { wMin: 160, wMax: 320, wPerChar: 18, wPad: 40, fontMin: 14, fontMax: 30, fontPad: 34, h: 60, radius: 22 },
  LEAF:   { wMin: 130, wMax: 280, wPerChar: 14, wPad: 34, fontMin: 12, fontMax: 22, fontPad: 28, h: 48, radius: 18 },
} as const

/** Canvas viewport zoom + fit-to-view (composables/useViewport.ts). */
export const VIEWPORT = {
  ZOOM_MIN: 0.3,
  ZOOM_MAX: 2.6,
  /** Multiplier for the +/- zoom buttons. */
  ZOOM_STEP: 1.2,
  /** Multiplier per wheel/trackpad zoom tick. */
  WHEEL_ZOOM_STEP: 1.12,
  /** Padding around the graph bbox when fitting (world px). */
  FIT_MARGIN: 60,
  /** Clamp on the zoom chosen by fitView. */
  FIT_ZOOM_MIN: 0.45,
  FIT_ZOOM_MAX: 1.3,
  /** Viewport width under which the layout is treated as narrow (mobile). */
  NARROW_BREAKPOINT: 800,
  /** Viewport width at/above which the side note is assumed open. */
  SIDENOTE_BREAKPOINT: 1100,
  /** Screen px reserved for chrome when fitting, by layout. */
  TOP_RESERVE_NARROW: 150, TOP_RESERVE_WIDE: 170,
  BOTTOM_RESERVE_NARROW: 110, BOTTOM_RESERVE_WIDE: 70,
  RIGHT_RESERVE_SIDENOTE: 320, RIGHT_RESERVE: 24,
  LEFT_RESERVE: 24,
  /** Floor on the available fit area (screen px). */
  MIN_AVAIL: 200,
} as const

/** AI panel default anchor + offsets (pages/index.vue, components/AIPanel.vue). */
export const AI_PANEL = {
  DEFAULT_ANCHOR_X: 110,
  DEFAULT_ANCHOR_Y: 144,
  /** Min left edge so the panel never clips off-screen (px). */
  ANCHOR_MIN_X: 8,
  /** Gap below the Ask-AI button (px). */
  ANCHOR_GAP_Y: 10,
} as const

/** CORS preflight cache lifetime (server/middleware/cors.ts), seconds. */
export const CORS_MAX_AGE_SEC = 86400

export const HEADER_FIREWORKS_KEY = 'x-fireworks-key'
export const STORAGE_KEY_API_KEYS = 'nf:api-keys'

/** Internal API routes — no hardcoded paths at call sites. */
export const API_ROUTES = {
  analyze: '/api/ai/analyze',
} as const

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
