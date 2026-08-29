export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  devtools: {
    enabled: true
  },

  modules: ['@nuxtjs/tailwindcss'],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'RefreshJWT — Refresh Token Rotation',
      meta: [
        {
          name: 'description',
          content:
            'Démo pédagogique de rotation de refresh token (JWT) : access token de courte durée, refresh token en cookie HttpOnly, rotation et révocation à chaque utilisation.'
        }
      ],
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com'
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: ''
        },
        {
          rel: 'stylesheet',
          href:
            'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap'
        }
      ]
    }
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api'
    }
  },

  routeRules: {
    '/api/**': {
      proxy: 'http://api:5000/api/**'
    }
  }
})