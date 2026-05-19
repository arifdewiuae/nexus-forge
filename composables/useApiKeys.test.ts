// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { STORAGE_KEY_API_KEYS } from '~/lib/config'

// ── Mock Nuxt / Vue globals the composable depends on ────────────────────────

const mockConfig = { public: { demoKeysEnabled: false } }
vi.stubGlobal('useRuntimeConfig', () => mockConfig)

// Immediately invoke the onMounted callback so load() runs during the test.
vi.mock('vue', async (importActual) => {
  const actual = await importActual<typeof import('vue')>()
  return {
    ...actual,
    onMounted:   (fn: () => void) => fn(),
    onUnmounted: (_fn: () => void) => {},
  }
})

// Import AFTER mocks are set up.
const { useApiKeys } = await import('./useApiKeys')

// ── Helpers ──────────────────────────────────────────────────────────────────

function freshStore() {
  localStorage.clear()
  return useApiKeys()
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useApiKeys', () => {
  beforeEach(() => {
    localStorage.clear()
    mockConfig.public.demoKeysEnabled = false
  })

  it('starts with an empty key when localStorage is empty', () => {
    const { fireworksKey } = freshStore()
    expect(fireworksKey.value).toBe('')
  })

  it('save() persists the key to localStorage and updates the ref', () => {
    const { fireworksKey, save } = freshStore()
    save('fw_test_key')
    expect(fireworksKey.value).toBe('fw_test_key')
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_API_KEYS) ?? '{}')
    expect(stored.fireworksKey).toBe('fw_test_key')
  })

  it('save() trims whitespace', () => {
    const { fireworksKey, save } = freshStore()
    save('  fw_padded  ')
    expect(fireworksKey.value).toBe('fw_padded')
  })

  it('clear() removes the key from localStorage and resets the ref', () => {
    const { fireworksKey, save, clear } = freshStore()
    save('fw_to_remove')
    clear()
    expect(fireworksKey.value).toBe('')
    expect(localStorage.getItem(STORAGE_KEY_API_KEYS)).toBeNull()
  })

  it('load() reads an existing localStorage entry on mount', () => {
    localStorage.setItem(STORAGE_KEY_API_KEYS, JSON.stringify({ fireworksKey: 'fw_persisted' }))
    const { fireworksKey } = useApiKeys()
    expect(fireworksKey.value).toBe('fw_persisted')
  })

  it('load() is resilient to corrupted localStorage data', () => {
    localStorage.setItem(STORAGE_KEY_API_KEYS, 'not-valid-json{{{')
    const { fireworksKey } = useApiKeys()
    expect(fireworksKey.value).toBe('')
  })

  describe('hasKey', () => {
    it('is false when no key and demoKeysEnabled is false', () => {
      const { hasKey } = freshStore()
      expect(hasKey.value).toBe(false)
    })

    it('is true when user has saved a key', () => {
      const { hasKey, save } = freshStore()
      save('fw_my_key')
      expect(hasKey.value).toBe(true)
    })

    it('is true when demoKeysEnabled is true even without a user key', () => {
      mockConfig.public.demoKeysEnabled = true
      const { hasKey } = freshStore()
      expect(hasKey.value).toBe(true)
    })
  })

  describe('cross-tab sync', () => {
    it('reloads the key when a storage event fires for the API key slot', () => {
      const { fireworksKey } = freshStore()
      expect(fireworksKey.value).toBe('')

      // Simulate another tab writing the key
      localStorage.setItem(STORAGE_KEY_API_KEYS, JSON.stringify({ fireworksKey: 'fw_from_other_tab' }))
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY_API_KEYS }))

      expect(fireworksKey.value).toBe('fw_from_other_tab')
    })

    it('ignores storage events for unrelated keys', () => {
      const { fireworksKey, save } = freshStore()
      save('fw_original')
      window.dispatchEvent(new StorageEvent('storage', { key: 'some-other-key' }))
      expect(fireworksKey.value).toBe('fw_original')
    })
  })
})
