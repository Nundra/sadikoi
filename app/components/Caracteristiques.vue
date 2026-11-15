<script setup lang="ts">
import { SADIDA, invocationsEnJeu, type Stats } from '~~/engine/partie'
import { t } from '~/i18n'

const store = usePartieStore()

/** Caractéristiques réglées dans les réglages ; la Prycipithon ajoute 2 PA au tour 1. Invocations : places restantes. */
const lignes = computed(() => {
  const s = store.partie?.entites.find(e => e.id === SADIDA)
  const max = store.statsDepart
  return ([
    ['pa', '#6fb4ee', s?.pa],
    ['pm', '#86cf62', s?.pm],
    ['po', '#e7b25a', max.po],
    ['invo', '#e8925a', store.partie ? max.invo - invocationsEnJeu(store.partie) : max.invo],
  ] as const).map(([cle, couleur, reste]) => ({ cle: cle as keyof Stats, nom: t(`carac.${cle}`), couleur, reste: reste ?? max[cle], max: max[cle] }))
})
</script>

<template>
  <section class="panneau caracteristiques" aria-labelledby="titre-carac">
    <div class="entete">
      <h2 id="titre-carac">{{ t('carac.titre') }}</h2>
      <span>{{ t('carac.restant') }}</span>
    </div>
    <label class="prycipithon" :title="store.verrouille ? t('carac.verrouille') : undefined">
      <input type="checkbox" :checked="store.prycipithon" :disabled="store.verrouille" @change="store.basculerPrycipithon()">
      <img src="/icones/prycipithon.png" alt="" class="picto">
      <span class="texte">
        <strong>Prycipithon Mate</strong>
        <span>{{ t('carac.prycipithon') }}</span>
      </span>
    </label>
    <div v-for="l in lignes" :key="l.cle" class="ligne">
      <img :src="`/icones/${l.cle}.png`" alt="" class="picto">
      <span class="nom">{{ l.nom }}</span>
      <span class="valeur"><strong :style="{ color: l.couleur }">{{ l.reste }}</strong> / {{ l.max }}</span>
    </div>
  </section>
</template>

<style scoped>
.caracteristiques { width: 300px; flex: none; display: flex; flex-direction: column; gap: 6px; }
.entete { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
h2 { margin: 0; font-family: var(--police-titre); font-size: 16px; font-weight: 400; color: var(--or-clair); }
.entete span { font-size: 11px; color: var(--texte-gris); font-weight: 700; }
.prycipithon {
  display: flex; align-items: center; gap: 8px; padding: 4px 8px; border-radius: 8px; cursor: pointer;
  background: var(--fond-creux); border: 1px solid #263b41;
}
.prycipithon:has(input:checked) { border-color: var(--or); }
.prycipithon:has(input:disabled) { cursor: default; opacity: 0.7; }
.prycipithon input { width: 16px; height: 16px; margin: 0; accent-color: var(--or); flex: none; }
.prycipithon .texte { display: flex; flex-direction: column; line-height: 1.2; font-size: 11px; color: var(--texte-gris); }
.prycipithon strong { font-size: 13px; color: var(--texte); }
.ligne { display: flex; align-items: center; gap: 10px; height: 26px; }
.picto { width: 24px; height: 24px; flex: none; object-fit: contain; border-radius: 4px; }
.nom { flex: 1; min-width: 0; font-size: 13px; font-weight: 700; color: var(--texte-doux); }
.valeur { white-space: nowrap; font-size: 13px; color: var(--texte-gris); text-align: right; }
.valeur strong { font-size: 18px; font-weight: 800; }
</style>
