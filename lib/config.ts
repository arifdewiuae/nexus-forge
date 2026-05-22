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
  MAX_REQUESTS: 20,
  WINDOW_MS: 60 * 60 * 1000,
} as const

export const HEADER_FIREWORKS_KEY = 'x-fireworks-key'
export const STORAGE_KEY_API_KEYS = 'nf:api-keys'
