export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  // V1 : tout se passe dans le navigateur, pas besoin de rendu serveur.
  ssr: false,
  modules: ['@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/icone-192.png' },
        // Polices hébergées sur le site (public/polices) : aucune requête vers Google
        { rel: 'preload', href: '/polices/nunito-sans.woff2', as: 'font', type: 'font/woff2', crossorigin: '' },
        { rel: 'preload', href: '/polices/marcellus.woff2', as: 'font', type: 'font/woff2', crossorigin: '' },
      ],
    },
  },
  devtools: { enabled: true },
})
