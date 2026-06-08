export default defineNuxtConfig({
  compatibilityDate: '2026-05-15',
  telemetry: false,
  devtools: { enabled: true },

  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },

  modules: [
    '@pinia/nuxt',
  ],

  runtimeConfig: {
    public: {
      demoKeysEnabled: false,
    },
  },

  css: ['~/assets/css/globals.css'],

  imports: {
    dirs: ['stores'],
  },

  typescript: {
    strict: true,
  },
})
