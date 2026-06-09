/* =========================================================
   stores/useSettingsStore.ts — accent colour, theme persistence
   ========================================================= */
import { defineStore, skipHydrate } from 'pinia'

const THEME_KEY = 'nf:theme:accent'

/** Default accent colour used until the user picks one (and as the SSR fallback). */
export const DEFAULT_ACCENT = '#c4604a'

export const useSettingsStore = defineStore('settings', () => {
  const accentColor = ref<string>(
    import.meta.client ? (localStorage.getItem(THEME_KEY) ?? DEFAULT_ACCENT) : DEFAULT_ACCENT
  )

  function setAccent(color: string) {
    accentColor.value = color
    if (import.meta.client) {
      localStorage.setItem(THEME_KEY, color)
      document.documentElement.style.setProperty('--accent', color)
    }
  }

  return {
    accentColor: skipHydrate(accentColor),
    setAccent,
  }
})
