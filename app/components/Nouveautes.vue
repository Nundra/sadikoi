<script setup lang="ts">
import { t } from '~/i18n'

/**
 * Nouveauté de l'app, montrée une seule fois, après la bienvenue (`sadikoi:nouveaute` garde
 * la dernière vue) : dès l'arrivée si la bienvenue a déjà été vue, sinon quand on la referme
 * (le bandeau appelle `ouvrirSiNouvelle`). Émet `libre` une fois fermée, ou tout de suite s'il
 * n'y a rien à montrer (l'invitation au défi du jour suit). Pour annoncer la suivante : changer
 * NOUVEAUTE et les textes « nouveaute.* ».
 */
const NOUVEAUTE = 'createur-de-map'

const store = usePartieStore()
const emit = defineEmits<{ libre: [] }>()
const dialogue = ref<HTMLDialogElement | null>(null)

function ouvrirSiNouvelle() {
  let vue = false
  try {
    vue = localStorage.getItem('sadikoi:nouveaute') === NOUVEAUTE
  } catch {
    // stockage indisponible : on ne l'impose pas à chaque visite
    vue = true
  }
  if (!vue) dialogue.value?.showModal()
  else emit('libre')
}

/** Vue pour de bon : à la fermeture (boutons, ou Échap par l'événement `close`). */
let liberee = false
function surFermeture() {
  // Une seule fois : le bouton appelle cette fonction, et l'événement `close` aussi (s'il vient)
  if (!liberee) {
    liberee = true
    emit('libre')
  }
  try {
    localStorage.setItem('sadikoi:nouveaute', NOUVEAUTE)
  } catch {
    // stockage indisponible : sans conséquence
  }
}

function fermer() {
  dialogue.value?.close()
  surFermeture()
}

function essayer() {
  liberee = true
  fermer()
  store.ouvrirCreation()
}

onMounted(() => {
  let bienvenueVue = false
  try {
    bienvenueVue = localStorage.getItem('sadikoi:bienvenue') === 'vue'
  } catch {
    // stockage indisponible : la bienvenue s'ouvre, la nouveauté attendra qu'on la referme
  }
  if (bienvenueVue) ouvrirSiNouvelle()
})

defineExpose({ ouvrirSiNouvelle })
</script>

<template>
  <dialog ref="dialogue" class="nouveautes" aria-labelledby="titre-nouveautes" @close="surFermeture">
    <p class="etiquette">{{ t('nouveaute.etiquette') }}</p>
    <h2 id="titre-nouveautes">{{ t('nouveaute.titre') }}</h2>
    <p>{{ t('nouveaute.texte') }}</p>
    <p class="defi">{{ t('nouveaute.defi') }}</p>
    <div class="boutons">
      <button type="button" @click="fermer">{{ t('nouveaute.plus-tard') }}</button>
      <button type="button" class="fin" @click="essayer">{{ t('nouveaute.essayer') }}</button>
    </div>
  </dialog>
</template>

<style scoped>
.nouveautes {
  border-radius: 16px; border: 1px solid var(--or); background: linear-gradient(#18292f, #132227);
  color: var(--texte); padding: 24px 28px; width: var(--largeur-fenetre); text-align: center;
  font-size: 14px; line-height: 1.5;
}
.nouveautes::backdrop { background: rgb(5 10 12 / 0.75); }
.etiquette {
  display: inline-block; margin: 0 0 8px; padding: 2px 12px; border-radius: 999px;
  background: var(--or); color: #2a1d08; font-size: 12px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;
}
h2 { margin: 0 0 10px; font-family: var(--police-titre); font-size: 24px; font-weight: 400; color: var(--or-clair); }
p { margin: 0 0 10px; color: var(--texte-doux); }
.defi { color: var(--texte); font-weight: 800; }
.boutons { display: flex; gap: 10px; margin-top: 16px; }
.boutons button { flex: 1; }
.boutons .fin { margin: 0; }
</style>
