import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'

// Tests simulate the client runtime. Vite's `define` can't replace
// `import.meta.client` (it special-cases import.meta), so do it by transform.
const replaceNuxtBuildFlags = {
  name: 'replace-nuxt-build-flags',
  transform(code: string, id: string) {
    if (id.includes('node_modules')) return
    if (!code.includes('import.meta.client') && !code.includes('import.meta.server')) return
    return code
      .replace(/import\.meta\.client/g, 'true')
      .replace(/import\.meta\.server/g, 'false')
  },
}

export default defineConfig({
  plugins: [
    replaceNuxtBuildFlags,
    vue(),
    AutoImport({
      imports: ['vue', 'pinia'],
      dts: false,
    }),
  ],
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, '.'),
    },
  },
})
