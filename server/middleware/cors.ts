export default defineEventHandler((event) => {
  const origin = getHeader(event, 'origin') ?? ''
  const host   = getHeader(event, 'host')   ?? ''

  // Allow same-origin requests and localhost dev.
  // Exact match only — `origin.includes(host)` would let evil-<host> through.
  const allowed =
    !origin ||
    origin === `https://${host}` ||
    origin === `http://${host}` ||
    /^https?:\/\/localhost(:\d+)?$/.test(origin)

  if (allowed) {
    setResponseHeader(event, 'Access-Control-Allow-Origin', origin || '*')
  }

  if (event.method === 'OPTIONS') {
    setResponseHeaders(event, {
      'Access-Control-Allow-Methods':  'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers':  'Content-Type, x-fireworks-key',
      'Access-Control-Max-Age':        '86400',
    })
    event.node.res.statusCode = 204
    event.node.res.end()
  }
})
