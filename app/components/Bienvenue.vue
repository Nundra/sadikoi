<script setup lang="ts">
import { POINTS_PAR_PA, POINTS_TOUR_2 } from '~~/engine/partie'
import { ETOILES_POUR_AVANCER } from '~/stores/partie'
import { t, type Cle } from '~/i18n'

/**
 * Présentation de l'app : ouverte d'office à la première visite (sadikoi:bienvenue),
 * puis à la demande avec le bouton d'aide du bandeau.
 */
const dialogue = ref<HTMLDialogElement | null>(null)

function ouvrir() {
  dialogue.value?.showModal()
  // Le focus va sur « C'est parti », en bas : on garde la fenêtre affichée depuis le haut
  if (dialogue.value) dialogue.value.scrollTop = 0
}

function fermer() {
  try {
    localStorage.setItem('sadikoi:bienvenue', 'vue')
  } catch {
    // stockage indisponible : la fenêtre s'ouvrira de nouveau à la prochaine visite
  }
  dialogue.value?.close()
}

onMounted(() => {
  let dejaVue = false
  try {
    dejaVue = localStorage.getItem('sadikoi:bienvenue') === 'vue'
  } catch {
    // stockage indisponible : on l'affiche
  }
  if (!dejaVue) ouvrir()
})

defineExpose({ ouvrir })
</script>

<template>
  <!-- Les textes à mise en forme (<strong>, <em>) viennent des dictionnaires de app/i18n, jamais de l'utilisateur -->
  <dialog ref="dialogue" class="bienvenue" aria-labelledby="titre-bienvenue" @close="fermer">
    <img src="/logo.png" alt="" class="logo">
    <h2 id="titre-bienvenue">{{ t('bienvenue.titre') }}</h2>
    <p class="accroche" v-html="t('bienvenue.accroche')" />

    <section>
      <h3>{{ t('bienvenue.jouer') }}</h3>
      <ol>
        <li v-for="k in 4" :key="k" v-html="t(`bienvenue.jouer-${k}` as Cle)" />
      </ol>
    </section>

    <section>
      <h3>{{ t('bienvenue.score') }}</h3>
      <ul>
        <li v-html="t('bienvenue.score-1')" />
        <li v-html="t('bienvenue.score-2')" />
        <li v-html="t('bienvenue.score-3', { pa: POINTS_PAR_PA, t2: POINTS_TOUR_2 })" />
      </ul>
    </section>

    <section>
      <h3>{{ t('bienvenue.modes') }}</h3>
      <ul>
        <li v-html="t('bienvenue.modes-1', { n: ETOILES_POUR_AVANCER })" />
        <li v-html="t('bienvenue.modes-2')" />
        <li v-html="t('bienvenue.modes-3')" />
        <li v-html="t('bienvenue.modes-4')" />
      </ul>
    </section>

    <p class="note">{{ t('bienvenue.note') }}</p>

    <button type="button" class="fin" @click="fermer">{{ t('bienvenue.go') }}</button>
  </dialog>
</template>

<style scoped>
.bienvenue {
  border-radius: 16px; border: 1px solid var(--or); background: linear-gradient(#18292f, #132227);
  color: var(--texte); padding: 22px 28px; width: min(640px, 92vw); max-height: 90vh;
  font-size: 14px; line-height: 1.5;
}
.bienvenue::backdrop { background: rgb(5 10 12 / 0.75); }
.logo { display: block; height: 72px; width: auto; margin: 0 auto 8px; }
h2 { margin: 0 0 8px; font-family: var(--police-titre); font-size: 24px; font-weight: 400; color: var(--or-clair); text-align: center; }
.accroche { margin: 0 0 14px; text-align: center; color: var(--texte-doux); }
section { margin-bottom: 12px; }
h3 { margin: 0 0 4px; font-size: 15px; font-weight: 800; color: var(--or-clair); }
ol, ul { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; color: var(--texte-doux); }
/* Mise en forme venue des dictionnaires (v-html) : hors de la portée des styles scoped sans :deep */
:deep(strong) { color: var(--texte); }
.note { margin: 4px 0 16px; padding: 8px 12px; border-radius: 8px; background: var(--fond-creux); border: 1px solid #263b41; font-size: 12px; color: var(--texte-gris); }
.fin { width: 100%; }
</style>
