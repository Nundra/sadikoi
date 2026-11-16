<script setup lang="ts">
import { langue, pageDuChemin, t } from '~/i18n'

/**
 * Une seule page servie partout (Cloudflare Pages) : le jeu (le défi du jour sur /daily), ou
 * les mentions légales sur /legals (même slug dans toutes les langues : /legals, /en/legals…).
 */
const legal = pageDuChemin(window.location.pathname) === 'legals'

useHead({
  title: () => (legal ? `${t('legal.titre')} · Sadikoi` : t('app.titre')),
  htmlAttrs: { lang: langue },
  meta: [{ name: 'description', content: () => t('app.description') }],
})
</script>

<template>
  <MentionsLegales v-if="legal" />
  <Jeu v-else />
</template>
