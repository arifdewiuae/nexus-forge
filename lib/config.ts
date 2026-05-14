export const STORAGE_KEYS = {
  BOARD_PREFS: 'nf:board-prefs',
  USER_COLOR: 'nf:user-color',
  USER_NAME: 'nf:user-name',
} as const

export const CANVAS_DEFAULTS = {
  BACKGROUND: '#0f172a',
  ZOOM_MIN: 0.05,
  ZOOM_MAX: 8,
  GRID_SIZE: 20,
} as const

export const STICKY_COLORS = [
  '#fef9c3', // yellow
  '#dbeafe', // blue
  '#d1fae5', // green
  '#fce7f3', // pink
  '#ede9fe', // purple
  '#ffedd5', // orange
] as const

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

export const WS_ROOM_PREFIX = 'nf:'

export const PRESENCE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
] as const
