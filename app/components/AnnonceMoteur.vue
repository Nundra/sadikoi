<script setup lang="ts">
import { t, type Cle } from '~/i18n'

/**
 * Mise à jour du moteur : ce qui change dans les règles (voir utils/annonce.ts). S'ouvre à
 * l'arrivée, une fois par joueur, avant l'invitation au défi du jour ; `libre` signale qu'elle
 * vient d'être refermée.
 */
const emit = defineEmits<{ libre: [] }>()
const dialogue = ref<HTMLDialogElement | null>(null)
let ouverte = false

/** Le bouton l'appelle lui-même, sans attendre `close` (pas toujours déclenché) ; Échap passe par `close`. */
function surFermeture() {
  if (!ouverte) return
  ouverte = false
  annonceVue()
  emit('libre')
}
function fermer() {
  surFermeture()
  dialogue.value?.close()
}

onMounted(() => {
  if (!annonceAFaire()) return
  ouverte = true
  dialogue.value?.showModal()
})
</script>

<template>
  <dialog ref="dialogue" class="annonce" aria-labelledby="titre-annonce" @close="surFermeture">
    <img src="/icones/fuite.png" alt="" class="picto">
    <p class="surtitre">{{ t('annonce.surtitre') }}</p>
    <h2 id="titre-annonce">{{ t('annonce.titre') }}</h2>
    <ul>
      <li v-for="k in 4" :key="k">{{ t(`annonce.point-${k}` as Cle) }}</li>
    </ul>
    <button type="button" class="fin" @click="fermer">{{ t('annonce.compris') }}</button>
  </dialog>
</template>

<style scoped>
.annonce {
  border-radius: 16px; border: 1px solid var(--or); background: linear-gradient(#18292f, #132227);
  color: var(--texte); padding: 24px 28px; width: var(--largeur-fenetre);
  font-size: 14px; line-height: 1.5;
}
.annonce::backdrop { background: rgb(5 10 12 / 0.75); }
.picto { display: block; width: 44px; height: 44px; margin: 0 auto 6px; object-fit: contain; }
.surtitre { margin: 0; text-align: center; font-size: 12px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--texte-gris); }
h2 { margin: 2px 0 14px; text-align: center; font-family: var(--police-titre); font-size: 24px; font-weight: 400; color: var(--or-clair); }
ul { margin: 0; padding-left: 20px; color: var(--texte-doux); display: flex; flex-direction: column; gap: 6px; }
.fin { width: 100%; margin-top: 18px; }
</style>
