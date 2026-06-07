import { describe, it, expect } from 'vitest'
import { stripSuggesterJson } from './thinking'

describe('stripSuggesterJson', () => {
  it('returns prose unchanged when there is no JSON block', () => {
    const text = 'Your map is thin on the Research branch.\n\nConsider adding pricing.'
    expect(stripSuggesterJson(text)).toBe(text)
  })

  it('strips a trailing suggester JSON array', () => {
    const raw = 'Here is my analysis.\n\n[\n  { "kind": "add_node", "label": "X", "parentId": "root" }\n]'
    expect(stripSuggesterJson(raw)).toBe('Here is my analysis.')
  })

  it('keeps a bracket that is not a kind-array', () => {
    const raw = 'See item [1] for details.'
    expect(stripSuggesterJson(raw)).toBe(raw)
  })

  it('trims trailing whitespace before the stripped block', () => {
    const raw = 'Done.   \n\n[{"kind":"tidy_layout"}]'
    expect(stripSuggesterJson(raw)).toBe('Done.')
  })

  it('handles an empty string', () => {
    expect(stripSuggesterJson('')).toBe('')
  })
})
