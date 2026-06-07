/**
 * Mind-map domain state-machines. Each union TYPE is derived from its paired
 * `as const` object, so the values exist at runtime (no bare string literals in
 * logic) and the type can never drift from them.
 */

/** Canvas tool mode — drives pointer behaviour on the SVG canvas. */
export const TOOL = {
  select:  'select',
  add:     'add',
  branch:  'branch',
  connect: 'connect',
  erase:   'erase',
} as const
export type Tool = (typeof TOOL)[keyof typeof TOOL]

/** Board persistence status (debounced localStorage save). */
export const SAVE_STATUS = {
  idle:   'idle',
  saving: 'saving',
  saved:  'saved',
} as const
export type SaveStatus = (typeof SAVE_STATUS)[keyof typeof SAVE_STATUS]
