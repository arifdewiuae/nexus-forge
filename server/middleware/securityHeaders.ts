import { SECURITY_HEADERS } from '~/lib/config'

/**
 * Sets security headers on every Nitro response. Works in `pnpm preview` and on
 * Vercel functions; vercel.json mirrors these so the CDN also sets them on static
 * assets. Header values are the single source of truth in lib/config.ts.
 */
export default defineEventHandler((event) => {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    setResponseHeader(event, name, value)
  }
})
