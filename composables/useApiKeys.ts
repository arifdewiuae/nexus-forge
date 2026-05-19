import { ref, computed, onMounted, onUnmounted } from 'vue'
import { STORAGE_KEY_API_KEYS } from '~/lib/config'

export function useApiKeys() {
  const fireworksKey = ref('')

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_API_KEYS)
      fireworksKey.value = raw ? (JSON.parse(raw).fireworksKey ?? '') : ''
    } catch {
      fireworksKey.value = ''
    }
  }

  function save(key: string) {
    const trimmed = key.trim()
    localStorage.setItem(STORAGE_KEY_API_KEYS, JSON.stringify({ fireworksKey: trimmed }))
    fireworksKey.value = trimmed
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY_API_KEYS)
    fireworksKey.value = ''
  }

  function onStorage(e: StorageEvent) {
    if (e.key === STORAGE_KEY_API_KEYS) load()
  }

  onMounted(() => {
    load()
    window.addEventListener('storage', onStorage)
  })

  onUnmounted(() => window.removeEventListener('storage', onStorage))

  const config = useRuntimeConfig()
  const demoKeysEnabled = config.public.demoKeysEnabled === true
  const hasKey = computed(() => demoKeysEnabled || fireworksKey.value.length > 0)

  return { fireworksKey, hasKey, demoKeysEnabled, save, clear }
}
