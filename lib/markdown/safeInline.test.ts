import { describe, it, expect } from 'vitest'
import { renderSafeMarkdown } from './safeInline'

describe('renderSafeMarkdown – XSS payloads', () => {
  it('escapes raw <script> tags', () => {
    const out = renderSafeMarkdown('<script>alert(1)</script>')
    expect(out).not.toContain('<script>')
    expect(out).toContain('&lt;script&gt;')
  })

  it('escapes <img onerror> payload', () => {
    const out = renderSafeMarkdown('<img src=x onerror=alert(1)>')
    expect(out).not.toContain('<img')
    expect(out).toContain('&lt;img')
  })

  it('does not produce anchor tags for markdown link syntax', () => {
    // The formatter intentionally does NOT support links — no <a> is ever emitted.
    const out = renderSafeMarkdown('[click](javascript:alert(1))')
    expect(out).not.toContain('<a')
    expect(out).not.toContain('href')
    // The raw `javascript:` text is harmless when not inside an href attribute
    // because there is no anchor element to click.
  })

  it('escapes bare & and quotes', () => {
    const out = renderSafeMarkdown('a & b "c" \'d\'')
    expect(out).toContain('&amp;')
    expect(out).toContain('&quot;')
  })
})

describe('renderSafeMarkdown – markdown transforms', () => {
  it('renders **bold**', () => {
    const out = renderSafeMarkdown('This is **bold** text')
    expect(out).toContain('<strong>bold</strong>')
    expect(out).not.toContain('**')
  })

  it('renders *italic*', () => {
    const out = renderSafeMarkdown('This is *italic* text')
    expect(out).toContain('<em>italic</em>')
    expect(out).not.toContain(/\*italic\*/)
  })

  it('renders `code`', () => {
    const out = renderSafeMarkdown('Use `console.log`')
    expect(out).toContain('<code>console.log</code>')
  })

  it('renders --- as <hr>', () => {
    const out = renderSafeMarkdown('---')
    expect(out).toContain('<hr')
  })

  it('converts newlines to <br>', () => {
    const out = renderSafeMarkdown('line1\nline2')
    expect(out).toContain('<br')
  })

  it('does not double-escape already safe content', () => {
    const out = renderSafeMarkdown('plain text')
    expect(out).toBe('plain text')
  })
})
