/* =========================================================
   stores/useSettingsStore.ts — accent colour, theme persistence
   ========================================================= */
import { defineStore, skipHydrate } from 'pinia'

const THEME_KEY = 'nf:theme:accent'

export const useSettingsStore = defineStore('settings', () => {
  const accentColor = ref<string>(
    import.meta.client ? (localStorage.getItem(THEME_KEY) ?? '#c4604a') : '#c4604a'
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
