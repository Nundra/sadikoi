<script setup lang="ts">
import { langue, t } from '~/i18n'

/**
 * Une seule page servie partout (Cloudflare Pages) : le jeu, ou les mentions légales sur
 * /legals (même adresse dans toutes les langues : /legals, /en/legals, /es/legals).
 */
const legal = /\/legals\/?$/.test(window.location.pathname)

useHead({ title: () => (legal ? `${t('legal.titre')} · Sadikoi` : t('app.titre')), htmlAttrs: { lang: langue } })
</script>

<template>
  <MentionsLegales v-if="legal" />
  <Jeu v-else />
</template>
