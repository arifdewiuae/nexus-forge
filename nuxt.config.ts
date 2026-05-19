export default defineNuxtConfig({
  compatibilityDate: '2026-05-15',
  telemetry: false,
  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
  ],

  runtimeConfig: {
    fireworksApiKey: process.env.FIREWORKS_API_KEY ?? '',
    public: {
      wsServerUrl: 'ws://localhost:1234',
      demoKeysEnabled: process.env.DEMO_KEYS_ENABLED === 'true',
    },
  },

  css: ['~/assets/css/globals.css'],

  ignore: ['ws-server/**'],

  vite: {
    plugins: [
      {
        name: 'stub-ws-for-browser',
        enforce: 'pre',
        resolveId(id: string, _: string | undefined, opts: { ssr?: boolean } = {}) {
          if (id === 'ws' && !opts.ssr) return '\0ws-browser-stub'
        },
        load(id: string) {
          if (id === '\0ws-browser-stub') {
            return `export class WebSocketServer {
  constructor() {}
  on() { return this }
  handleUpgrade() {}
}
export class WebSocket {}
export default {}`
          }
        },
      },
    ],
    optimizeDeps: {
      exclude: ['y-websocket'],
    },
    ssr: {
      external: ['ws', 'y-websocket'],
    },
  },

  imports: {
    dirs: ['stores'],
  },

  typescript: {
    strict: true,
  },
})
