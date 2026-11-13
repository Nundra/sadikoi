<script setup lang="ts">
import { sort as trouverSort } from '~~/engine/sorts'

const store = usePartieStore()

const sort = computed(() => (store.sortChoisi === null ? null : trouverSort(store.sortChoisi)))
const element = computed(() => (sort.value ? elementDuSort(sort.value) : null))

const contraintes = computed(() => {
  const s = sort.value
  if (!s) return ''
  return [
    s.ligne_de_vue === false ? 'sans ligne de vue' : null,
    s.en_ligne ? 'en ligne' : null,
    s.en_diagonale ? 'en diagonale' : null,
    s.case_libre ? 'case libre' : null,
    s.lancers_par_tour ? `${s.lancers_par_tour} / tour` : null,
    s.lancers_par_cible ? `${s.lancers_par_cible} / cible` : null,
    s.relance_initiale ? 'pas au tour 1' : null,
  ].filter(Boolean).join(' · ')
})
</script>

<template>
  <section class="panneau fiche" aria-labelledby="titre-fiche">
    <template v-if="sort && element">
      <img class="icone" :src="`/sorts/${sort.id}.png`" alt="">
      <div class="infos">
        <h2 id="titre-fiche">{{ sort.nom }}</h2>
        <p class="carac">
          {{ sort.pa }} PA · PO {{ porteeDuSort(sort, store.bonusPo) }}{{ sort.po_modifiable ? '' : ' (fixe)' }} · {{ element }}
          <template v-if="sort.variante_de"> · variante de {{ sort.variante_de.nom }}</template>
        </p>
        <p v-if="contraintes" class="carac">{{ contraintes }}</p>
        <p class="infection">{{ infectionDuSort(sort) }}</p>
      </div>
    </template>
    <div v-else class="infos">
      <h2 id="titre-fiche">{{ store.acteur?.nom ?? 'Sadida' }}</h2>
      <p v-if="store.phase === 'placement'" class="infection">
        Choisis ta case de départ parmi les cases bleues. Tu peux aussi régler tes caractéristiques et tes variantes.
      </p>
      <p v-else-if="store.acteur" class="infection">
        À {{ store.acteur.nom }} de jouer : clique une case verte pour te déplacer, ou choisis un sort dans la barre.
        « Fin du tour » passe la main à l’invocation suivante.
      </p>
      <p v-else class="infection">Tout le monde a joué : la salle est terminée.</p>
    </div>
  </section>
</template>

<style scoped>
.fiche { display: flex; gap: 14px; align-items: flex-start; }
.icone { width: 52px; height: 52px; flex: none; border-radius: 10px; border: 2px solid var(--or); }
.infos { flex: 1; min-width: 0; }
h2 { margin: 0 0 2px; font-size: 16px; font-weight: 800; color: var(--or-clair); }
.carac { margin: 0 0 4px; font-size: 12px; color: var(--texte-gris); font-weight: 700; }
.infection { margin: 4px 0 0; font-size: 13px; line-height: 1.4; color: #d6dcd8; }
</style>
