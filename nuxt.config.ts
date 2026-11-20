/** Adresse publique du site (images et liens absolus des aperçus de partage). */
const SITE = 'https://sadikoi.app/'
const DESCRIPTION = 'Entraîne-toi à infecter tous les ennemis dès le tour 1 avec le Sadida de Dofus 3 : défi du jour avec classement, mode infini, training sur toutes les maps et créateur de map. Gratuit, sans pub.'

export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  // V1 : tout se passe dans le navigateur, pas besoin de rendu serveur.
  ssr: false,
  modules: ['@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  app: {
    // Dans le HTML lui-même (pas posées par le JavaScript) : Discord, les réseaux et les moteurs
    // lisent la page sans exécuter l'app. En français, la langue par défaut ; le titre et la
    // description suivent ensuite la langue choisie (useHead dans app.vue). Image : scripts/og.py.
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'Sadikoi – entraînement à l’infection au tour 1',
      meta: [
        { name: 'description', content: DESCRIPTION },
        { name: 'theme-color', content: '#e0b25a' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Sadikoi' },
        { property: 'og:url', content: SITE },
        { property: 'og:title', content: 'Sadikoi – la salle d’entraînement du Sadida' },
        { property: 'og:description', content: DESCRIPTION },
        { property: 'og:image', content: `${SITE}og.png` },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'Sadikoi : infecte tous les ennemis dès le tour 1' },
        { property: 'og:locale', content: 'fr_FR' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
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
  // En dev, l'API du classement (functions/) tourne à part : `pnpm dlx wrangler pages dev --port 8788`
  // après un `pnpm generate`. Sans elle, le classement s'affiche « indisponible ».
  nitro: { devProxy: { '/api': { target: 'http://localhost:8788/api', changeOrigin: true } } },
})
