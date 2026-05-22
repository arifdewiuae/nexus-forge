/**
 * Minimal safe inline markdown formatter.
 *
 * Supports ONLY:
 *   **bold**        → <strong>bold</strong>
 *   *em* / _em_     → <em>em</em>
 *   `code`          → <code>code</code>
 *   ---             → <hr>
 *   \n              → <br>
 *
 * Everything else is HTML-escaped before parsing to prevent XSS.
 * No links, no images, no raw HTML — intentionally limited.
 */
export function renderSafeMarkdown(raw: string): string {
  // 1. HTML-escape all input first to neutralise any injected HTML
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  // 2. Apply markdown transforms on the escaped string
  return escaped
    // Horizontal rule — must come before bold/em to avoid --- being misread
    .replace(/^---$/gm, '<hr>')
    // Bold: **...**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic: *...* or _..._
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Newlines
    .replace(/\n/g, '<br>')
}
