<script setup lang="ts">
import { infectionDuSort, nomSort, t } from '~/i18n'

const store = usePartieStore()

const sort = computed(() => (store.sortChoisi === null ? null : store.sortAffiche(store.sortChoisi)))
const element = computed(() => (sort.value ? elementDuSort(sort.value) : null))

const contraintes = computed(() => {
  const s = sort.value
  if (!s) return ''
  return [
    s.ligne_de_vue === false ? t('sort.sans-ldv') : null,
    s.en_ligne ? t('sort.en-ligne') : null,
    s.en_diagonale ? t('sort.en-diagonale') : null,
    s.case_libre ? t('sort.case-libre') : null,
    s.lancers_par_tour ? t('sort.par-tour', { n: s.lancers_par_tour }) : null,
    s.lancers_par_cible ? t('sort.par-cible', { n: s.lancers_par_cible }) : null,
    s.relance_initiale ? t('sort.pas-tour-1') : null,
  ].filter(Boolean).join(' · ')
})
</script>

<template>
  <section class="panneau fiche" aria-labelledby="titre-fiche">
    <template v-if="sort && element">
      <img class="icone" :src="`/sorts/${sort.id}.png`" alt="">
      <div class="infos">
        <h2 id="titre-fiche">{{ nomSort(sort.id) }}</h2>
        <p class="carac">
          {{ t('sort.pa', { n: sort.pa }) }} · {{ t('sort.po', { po: porteeDuSort(sort, store.bonusPo) }) }}{{ sort.po_modifiable ? '' : t('sort.fixe') }} · {{ t(`element.${element}`) }}
          <template v-if="sort.variante_de"> · {{ t('sort.variante-de', { nom: nomSort(sort.variante_de.id) }) }}</template>
        </p>
        <p v-if="contraintes" class="carac">{{ contraintes }}</p>
        <p class="infection">{{ infectionDuSort(sort) }}</p>
      </div>
    </template>
    <div v-else class="infos">
      <h2 id="titre-fiche">{{ store.acteur ? store.nomAffiche(store.acteur) : 'Sadida' }}</h2>
      <p v-if="store.phase === 'placement'" class="infection">{{ t('fiche.placement') }}</p>
      <p v-else-if="store.acteur" class="infection">{{ t('fiche.a-toi', { e: store.nomAffiche(store.acteur) }) }}</p>
      <p v-else class="infection">{{ t('fiche.fini') }}</p>
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
