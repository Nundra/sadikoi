<script setup lang="ts">
import { t } from '~/i18n'

/**
 * Écran d'avertissement sur petit format (mobile, tablette en portrait) : l'app n'y est pas
 * adaptée. Ouvert à chaque visite sous LARGEUR_MIN ; « Continuer quand même » le ferme.
 * Placé en dernier dans app.vue pour s'ouvrir après la bienvenue, donc par-dessus.
 */
const LARGEUR_MIN = 1024

const dialogue = ref<HTMLDialogElement | null>(null)

onMounted(() => {
  if (window.matchMedia(`(max-width: ${LARGEUR_MIN - 1}px)`).matches) dialogue.value?.showModal()
})
</script>

<template>
  <dialog ref="dialogue" class="petit-ecran" aria-labelledby="titre-petit-ecran">
    <ChoixLangue en-ligne class="langues" />
    <img src="/logo.png" alt="" class="logo">
    <h2 id="titre-petit-ecran">{{ t('petit-ecran.titre') }}</h2>
    <p>{{ t('petit-ecran.texte') }}</p>
    <p class="conseil">{{ t('petit-ecran.conseil') }}</p>
    <button type="button" @click="dialogue?.close()">{{ t('petit-ecran.continuer') }}</button>
  </dialog>
</template>

<style scoped>
.petit-ecran {
  width: 100vw; max-width: none; height: 100dvh; max-height: none; margin: 0; padding: 32px 24px;
  border: 0; background: radial-gradient(120% 90% at 50% 30%, #16303a 0%, #0e1c22 55%, #0a1317 100%);
  color: var(--texte); text-align: center; font-size: 15px; line-height: 1.5;
}
.petit-ecran[open] { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
/* Langues en tête : un joueur étranger qui arrive sur / peut changer avant de lire */
.langues { margin-bottom: 24px; }
.langues :deep(.liste) { flex-wrap: wrap; justify-content: center; }
.logo { width: min(260px, 70vw); height: auto; margin-bottom: 12px; }
h2 { margin: 0 0 10px; font-family: var(--police-titre); font-size: 26px; font-weight: 400; color: var(--or-clair); }
p { margin: 0 0 10px; max-width: 420px; color: var(--texte-doux); }
.conseil { color: var(--texte); font-weight: 800; }
button { margin-top: 18px; padding: 0 22px; }
</style>
