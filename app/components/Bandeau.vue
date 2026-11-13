<script setup lang="ts">
import { nomJeu, t } from '~/i18n'

const store = usePartieStore()

const pourcentage = computed(() => `${Math.round((store.score?.part ?? 0) * 100)}%`)

/** Zone et sous-zone de la map, dans la langue choisie (la sous-zone seulement si elle diffère du nom). */
const lieu = computed(() => {
  const m = store.map
  if (!m) return ''
  return [m.zone, m.sous_zone !== m.nom ? m.sous_zone : null].filter(Boolean).map(x => nomJeu(x!)).join(' · ')
})

const reglages = ref<{ ouvrir: () => void } | null>(null)
const bienvenue = ref<{ ouvrir: () => void } | null>(null)
</script>

<template>
  <header class="bandeau">
    <h1 class="titre"><img src="/logo.png" alt="Sadikoi" width="140" height="58"></h1>

    <div class="pilule">
      <span class="mode">{{ t(`mode.${store.mode}`) }}</span><span aria-hidden="true">·</span><span>{{ t('bandeau.salle', { n: store.numeroSalle }) }}</span>
      <template v-if="store.mode === 'infini' && store.meilleureSerie">
        <span aria-hidden="true">·</span><span class="record" :title="t('bandeau.record-run-aide')">{{ t('bandeau.record-run', { n: store.meilleureSerie }) }}</span>
      </template>
    </div>

    <div class="objectif">
      <div class="map-courante">
        <span>{{ t('bandeau.objectif') }}</span>
        <span v-if="store.map" class="nom-map">
          {{ nomJeu(store.map.nom) }}<template v-if="store.map.boss"> · {{ t('bandeau.boss', { boss: store.map.boss.map(nomJeu).join(', ') }) }}</template>
        </span>
        <span v-if="store.map" class="lieu">
          {{ lieu }}
          <template v-if="!store.map.donjon"> · [{{ store.map.pos[0] }}, {{ store.map.pos[1] }}]</template>
        </span>
      </div>
      <div v-if="store.score" class="progression">
        <div class="jauge" aria-hidden="true"><div :style="{ width: pourcentage }" /></div>
        <span class="compte">{{ store.score.infectes }} / {{ store.score.total }}</span>
        <Etoiles :nombre="store.score.etoiles" />
        <span class="points">{{ t('bandeau.points', { n: store.score.points }) }}</span>
        <span v-if="store.record" class="record" :title="t('bandeau.record-aide', { points: store.record.points, pa: store.record.paDepenses })">{{ t('bandeau.record', { n: store.record.points }) }}</span>
      </div>
    </div>

    <div class="choix">
      <button v-if="store.mode === 'infini'" type="button" :title="t('bandeau.nouvelle-run-aide')" @click="store.nouvelleRun()">{{ t('bandeau.nouvelle-run') }}</button>
      <button v-else type="button" @click="store.nouvelleSalle()">{{ t('bandeau.autres-ennemis') }}</button>
      <button type="button" :title="store.lienPartage ? t('bandeau.partager-aide', { lien: store.lienPartage }) : undefined" @click="store.partager()">{{ t('bandeau.partager') }}</button>
      <ChoixLangue />
      <button type="button" class="engrenage" :aria-label="t('bandeau.reglages')" :title="t('bandeau.reglages')" @click="reglages?.ouvrir()">
        <span class="cle" aria-hidden="true" />
      </button>
      <button type="button" class="engrenage" :aria-label="t('bandeau.aide-long')" :title="t('bandeau.aide')" @click="bienvenue?.ouvrir()">
        <span class="interrogation" aria-hidden="true" />
      </button>
      <Reglages ref="reglages" />
      <Bienvenue ref="bienvenue" />
    </div>
  </header>
</template>

<style scoped>
.bandeau {
  min-height: 72px; padding: 10px 24px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
  background: linear-gradient(#1b2e35, #142329); border-bottom: 1px solid var(--bord); box-shadow: 0 2px 0 #0a1317;
}
.titre { margin: 0; display: flex; align-items: center; }
.titre img { height: 58px; width: auto; display: block; }
.pilule {
  display: flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px;
  background: var(--fond-creux); border: 1px solid var(--bord-clair); font-size: 14px; font-weight: 700;
}
.pilule .mode { color: #9fd27a; }
.pilule span[aria-hidden] { color: var(--texte-gris); }
.objectif { flex: 1; min-width: 300px; display: flex; justify-content: center; align-items: center; gap: 16px; }
.map-courante { display: flex; flex-direction: column; font-size: 14px; color: #b9c6c4; }
.nom-map { font-size: 12px; color: var(--texte-doux); font-weight: 700; }
.lieu { font-size: 12px; color: var(--texte-gris); }
.progression {
  display: flex; align-items: center; gap: 10px; padding: 6px 14px; border-radius: 10px;
  background: var(--fond-creux); border: 1px solid var(--bord-clair);
}
.jauge { width: 140px; height: 10px; border-radius: 6px; background: #22363c; overflow: hidden; }
.jauge div { height: 100%; border-radius: 6px; background: linear-gradient(90deg, #7cc35a, #b3e07a); transition: width 0.3s; }
/* Jamais de retour à la ligne dans la jauge (« 0 / 7 », « 0 pts ») */
.progression > * { flex: none; white-space: nowrap; }
.compte { font-size: 14px; font-weight: 800; }
.points { font-size: 14px; font-weight: 800; color: var(--or-clair); }
.record { font-size: 12px; color: var(--texte-gris); font-weight: 700; }
.choix { display: flex; align-items: center; gap: 10px; }
.choix > button:not(.engrenage) { padding: 0 18px; }
.engrenage { width: 44px; padding: 0; display: flex; align-items: center; justify-content: center; }
.engrenage .interrogation { width: 22px; height: 22px; background: var(--or); mask: url('/icones/aide.png') center / contain no-repeat; }
/* Picto blanc du jeu, teinté en doré */
.engrenage .cle { width: 24px; height: 24px; background: var(--or); mask: url('/icones/reglages.png') center / contain no-repeat; }
</style>
