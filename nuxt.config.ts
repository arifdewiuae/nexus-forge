export default defineNuxtConfig({
  telemetry: false,
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
    'shadcn-nuxt',
  ],

  shadcn: {
    prefix: '',
    componentDir: './components/ui',
  },

  colorMode: {
    classSuffix: '',
    preference: 'dark',
    fallback: 'dark',
  },

  runtimeConfig: {
    fireworksApiKey: '',
    public: {
      wsServerUrl: 'ws://localhost:1234',
    },
  },

  css: ['~/assets/css/globals.css'],

  imports: {
    dirs: ['stores', 'lib/canvas', 'lib/ai'],
  },

  typescript: {
    strict: true,
  },
})
