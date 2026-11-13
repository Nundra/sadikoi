<script setup lang="ts">
import { t } from '~/i18n'

withDefaults(defineProps<{ nombre: number, grand?: boolean, max?: number }>(), { max: 4 })
</script>

<template>
  <span class="etoiles" :class="{ grand }" role="img" :aria-label="t('etoiles', { n: nombre, max })">
    <!-- Étoiles du jeu (pictos blancs) colorées par masque : or, et mauve pour la 4e. Couleur par style, pas par classe (Firefox). -->
    <span
      v-for="i in max"
      :key="i"
      class="etoile"
      :style="{
        background: i === 4 ? 'var(--mandragore)' : 'var(--or)',
        maskImage: `url('/icones/${i <= nombre ? 'etoile-pleine' : 'etoile-vide'}.png')`,
        WebkitMaskImage: `url('/icones/${i <= nombre ? 'etoile-pleine' : 'etoile-vide'}.png')`,
      }"
    />
  </span>
</template>

<style scoped>
.etoiles { display: inline-flex; gap: 2px; }
.etoile { width: 20px; height: 20px; mask: center / contain no-repeat; -webkit-mask: center / contain no-repeat; }
.grand .etoile { width: 44px; height: 44px; }
</style>
