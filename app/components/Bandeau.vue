<script setup lang="ts">
import { adresse, nomJeu, t } from '~/i18n'

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
const invitation = ref<{ ouvrirSiAFaire: () => void } | null>(null)
</script>

<template>
  <header class="bandeau">
    <h1 class="titre"><img src="/logo.png" alt="Sadikoi" width="140" height="58"></h1>

    <!-- À côté du logo : on entre dans le défi du jour, ou on en sort vers le jeu habituel
         (le numéro de salle et le record de run sont sous le choix du mode, ChoixSalle) -->
    <a v-if="store.mode === 'daily'" class="lien-defi" :href="adresse()">{{ t('daily.quitter') }}</a>
    <a v-else class="lien-defi" :href="adresse('daily')"><span class="trophee" aria-hidden="true" />{{ t('daily.titre') }}</a>

    <div class="objectif">
      <div class="map-courante">
        <span>{{ t('bandeau.objectif') }}</span>
        <span v-if="store.map" class="nom-map">
          <template v-if="store.mode === 'daily'">{{ t('daily.map-du-jour') }} · </template>
          <template v-if="store.mode === 'creation'">{{ t('creation.nom-map') }}</template>
          <template v-else>{{ nomJeu(store.map.nom) }}</template><template v-if="store.map.boss"> · {{ t('bandeau.boss', { boss: store.map.boss.map(nomJeu).join(', ') }) }}</template>
        </span>
        <span v-if="store.map && store.mode !== 'creation'" class="lieu">
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
      <template v-else-if="store.mode === 'creation'">
        <button v-if="store.edition" type="button" :disabled="store.problemes.length > 0" @click="store.testerCarte()">{{ t('creation.tester') }}</button>
        <button v-else type="button" :title="t('creation.modifier-aide')" @click="store.modifierCarte()">{{ t('creation.modifier') }}</button>
      </template>
      <button v-else-if="store.mode !== 'daily'" type="button" @click="store.nouvelleSalle()">{{ t('bandeau.autres-ennemis') }}</button>
      <button type="button" :title="store.lienPartage ? t('bandeau.partager-aide', { lien: store.lienPartage }) : undefined" @click="store.partager()">{{ t('bandeau.partager') }}</button>
      <ChoixLangue />
      <button type="button" class="engrenage" :aria-label="t('bandeau.reglages')" :title="t('bandeau.reglages')" @click="reglages?.ouvrir()">
        <span class="cle" aria-hidden="true" />
      </button>
      <button type="button" class="engrenage" :aria-label="t('bandeau.aide-long')" :title="t('bandeau.aide')" @click="bienvenue?.ouvrir()">
        <span class="interrogation" aria-hidden="true" />
      </button>
      <Reglages ref="reglages" />
      <!-- Première visite : la bienvenue présente déjà les règles, l'annonce du moteur est inutile -->
      <Bienvenue ref="bienvenue" @libre="annonceVue(); invitation?.ouvrirSiAFaire()" />
      <AnnonceMoteur @libre="invitation?.ouvrirSiAFaire()" />
      <InvitationDaily ref="invitation" />
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
.lien-defi {
  display: flex; align-items: center; height: 44px; padding: 0 18px; border-radius: 10px;
  background: var(--fond-bouton); border: 1px solid var(--or); color: var(--or-clair);
  font-size: 14px; font-weight: 800; text-decoration: none;
}
.lien-defi:hover { background: #2a4048; }
.lien-defi { gap: 8px; }
/* Trophée blanc du jeu, coloré par masque */
.trophee { width: 18px; height: 18px; flex: none; background: var(--or); mask: url('/icones/trophee.png') center / contain no-repeat; -webkit-mask: url('/icones/trophee.png') center / contain no-repeat; }
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
