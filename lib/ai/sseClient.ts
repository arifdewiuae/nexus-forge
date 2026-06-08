/* =========================================================
   lib/ai/sseClient.ts — client-side Server-Sent Events reader
   ========================================================= */

const SSE_DATA_PREFIX = 'data: '

/**
 * Read an SSE response body as an async stream of parsed JSON events.
 * Decodes the byte stream, buffers partial frames, splits on newlines,
 * strips the `data: ` prefix, and skips blank / `[DONE]` lines. The caller
 * gets one typed event per `yield`; an aborted fetch surfaces as a thrown
 * AbortError from the underlying reader.
 */
export async function* readSseStream<T>(body: ReadableStream<Uint8Array>): AsyncGenerator<T> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''   // keep the trailing partial line for next chunk

      for (const line of lines) {
        if (!line.startsWith(SSE_DATA_PREFIX)) continue
        const raw = line.slice(SSE_DATA_PREFIX.length).trim()
        if (!raw || raw === '[DONE]') continue
        yield JSON.parse(raw) as T
      }
    }
  } finally {
    reader.releaseLock()
  }
}
