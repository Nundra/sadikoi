<script setup lang="ts">
import type { Langue } from '~/i18n'

/** Drapeau d'une langue (décoratif : le nom de la langue est donné à côté ou par le bouton). */
defineProps<{ langue: Langue }>()
</script>

<template>
  <svg v-if="langue === 'fr'" viewBox="0 0 3 2" class="drapeau" aria-hidden="true" focusable="false">
    <rect width="1" height="2" fill="#0055a4" />
    <rect x="1" width="1" height="2" fill="#fff" />
    <rect x="2" width="1" height="2" fill="#ef4135" />
  </svg>
  <svg v-else-if="langue === 'es'" viewBox="0 0 3 2" class="drapeau" aria-hidden="true" focusable="false">
    <rect width="3" height="2" fill="#aa151b" />
    <rect y="0.5" width="3" height="1" fill="#f1bf00" />
  </svg>
  <!-- Anglais : Union Jack -->
  <svg v-else viewBox="0 0 60 40" class="drapeau" aria-hidden="true" focusable="false">
    <rect width="60" height="40" fill="#012169" />
    <path d="M0 0L60 40M60 0L0 40" stroke="#fff" stroke-width="8" />
    <path d="M0 0L60 40M60 0L0 40" stroke="#c8102e" stroke-width="3" />
    <path d="M30 0V40M0 20H60" stroke="#fff" stroke-width="12" />
    <path d="M30 0V40M0 20H60" stroke="#c8102e" stroke-width="7" />
  </svg>
</template>

<style scoped>
/* Un liseré, pour que le blanc du drapeau français se détache du fond */
.drapeau { display: block; height: auto; border-radius: 2px; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.5); }
</style>
