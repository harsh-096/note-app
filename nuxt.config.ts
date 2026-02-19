// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/': { redirect: '/register' }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/main.css'],
  postcss:{
    plugins:{
      tailwindcss: {},
      autoprefixer: {}
    },
  },
  // Ensure "build" is NOT referencing @prisma/client here
})