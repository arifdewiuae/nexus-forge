/* =========================================================
   server/utils/sse.ts — Server-Sent Events plumbing
   ========================================================= */

/** H3 event type, derived without importing h3 directly (matches the rest of server/). */
type SseEvent = Parameters<typeof setResponseHeaders>[0]

export interface SseStream<T> {
  /** Write one SSE frame: `data: <json>\n\n`. */
  send(data: T): void
  /** End the response. */
  close(): void
  /** Aborts when the client disconnects — pass to long-running work. */
  signal: AbortSignal
}

/**
 * Open a Server-Sent Events stream on an H3 event: sets the streaming headers,
 * wires client-disconnect to an AbortController, and returns a typed
 * `send`/`close`/`signal` handle so routes never hand-roll the wire format.
 */
export function openSseStream<T>(event: SseEvent): SseStream<T> {
  setResponseHeaders(event, {
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache, no-transform',
    'Connection':        'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const controller = new AbortController()
  event.node.req.on('close', () => controller.abort())

  return {
    send: (data: T) => { event.node.res.write(`data: ${JSON.stringify(data)}\n\n`) },
    close: () => { event.node.res.end() },
    signal: controller.signal,
  }
}
