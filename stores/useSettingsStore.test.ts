// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.stubGlobal('import.meta.client', true)
vi.mock('#app', () => ({}))
vi.mock('#imports', () => ({}))

const { useSettingsStore } = await import('./useSettingsStore')

const DEFAULT_ACCENT = '#c4604a'

describe('useSettingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    document.documentElement.style.removeProperty('--accent')
  })

  it('defaults to the brand accent when nothing is stored', () => {
    const settings = useSettingsStore()
    expect(settings.accentColor).toBe(DEFAULT_ACCENT)
  })

  it('setAccent updates the value, persists it, and pushes the CSS var', () => {
    const settings = useSettingsStore()
    settings.setAccent('#123456')
    expect(settings.accentColor).toBe('#123456')
    expect(localStorage.getItem('nf:theme:accent')).toBe('#123456')
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#123456')
  })

  it('initialises from a previously stored accent', () => {
    localStorage.setItem('nf:theme:accent', '#abcdef')
    const settings = useSettingsStore()
    expect(settings.accentColor).toBe('#abcdef')
  })
})
