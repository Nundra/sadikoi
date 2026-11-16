<script setup lang="ts">
import { POINTS_PAR_PA, POINTS_TOUR_2 } from '~~/engine/partie'
import { invocation } from '~~/engine/sorts'
import { ETOILES_DAILY } from '~~/engine/daily'
import { t } from '~/i18n'
import { ETOILES_POUR_AVANCER } from '~/stores/partie'

const store = usePartieStore()

interface Ligne {
  index: number
  texte: string
  details: string[]
  res: string
  infecte: boolean
}

interface Phase {
  id: number
  nom: string
  ressources: string
  lignes: Ligne[]
}

/** Les actions regroupées par acteur, plus les invocations qui n'ont pas encore joué. */
const phases = computed<Phase[]>(() => {
  const p = store.partie
  if (!p) return []
  const out: Phase[] = []
  store.etapes.forEach(({ action, avant, bilan }, index) => {
    const a = bilan.acteur
    let phase = out.at(-1)
    if (!phase || phase.id !== a.id) {
      phase = { id: a.id, nom: store.nomAffiche(a), ressources: '', lignes: [] }
      out.push(phase)
    }
    const prec = avant.entites.find(e => e.id === a.id)!
    const [titre, ...details] = bilan.texte
    phase.lignes.push({
      index,
      texte: store.texte(titre!),
      details: details.map(store.texte),
      res: bilan.infectes.length ? t('timeline.infectes', { n: bilan.infectes.length })
        : bilan.mandragores.length ? t('timeline.sous-mandragore', { n: bilan.mandragores.length })
        : action.type === 'sort' ? t('timeline.pa', { n: store.sortAffiche(action.sort).pa })
          : action.type === 'deplacement' ? t('timeline.pm', { n: prec.pm - a.pm }) : '',
      infecte: bilan.infectes.length > 0 || bilan.mandragores.length > 0,
    })
  })
  // Ce qui reste à chacun, et les invocations qui n'ont pas encore agi
  for (const id of p.ordre) {
    const e = p.entites.find(x => x.id === id)
    let phase = out.find(x => x.id === id)
    if (!phase) {
      if (!e) continue
      phase = { id, nom: store.nomAffiche(e), ressources: '', lignes: [] }
      out.push(phase)
    }
    if (!e) {
      phase.ressources = t('timeline.parti')
      continue
    }
    const max = e.genre === 'sadida' ? p.stats : invocation(e.monstre!)
    phase.ressources = t('timeline.ressources', { pa: e.pa, paMax: max.pa, pm: e.pm, pmMax: max.pm })
      + (phase.lignes.length ? '' : ` · ${t('timeline.a-jouer')}`)
  }
  return out
})

const bouton = computed(() => {
  if (store.phase === 'placement') return { texte: t('timeline.valider'), action: store.validerPlacement, actif: store.sadida !== null }
  if (store.termine) return { texte: t('timeline.resultat'), action: () => dialogue.value?.showModal(), actif: true }
  const a = store.acteur
  return {
    texte: a ? t('timeline.fin-du-tour-de', { e: store.nomAffiche(a) }) : t('timeline.fin-du-tour'),
    action: store.finDuTour,
    actif: Boolean(a) && store.vue === null,
  }
})

const dialogue = ref<HTMLDialogElement | null>(null)
watch(() => store.termine, (fin) => {
  if (fin) dialogue.value?.showModal()
  else dialogue.value?.close()
})

// La ligne regardée reste visible dans la liste
const liste = ref<HTMLElement | null>(null)
watch(() => store.vue, async (v) => {
  await nextTick()
  liste.value?.querySelector(`[data-index="${v ?? store.etapes.length - 1}"]`)?.scrollIntoView({ block: 'nearest' })
})

const regardee = computed(() => store.vue ?? store.etapes.length - 1)
</script>

<template>
  <section class="panneau timeline" aria-labelledby="titre-timeline">
    <div class="entete">
      <h2 id="titre-timeline">{{ t('timeline.titre') }}</h2>
      <span class="tour">{{ store.phase === 'placement' ? t('timeline.placement') : t('timeline.tour-1') }}</span>
    </div>

    <div ref="liste" class="liste">
      <p v-if="store.phase === 'placement'" class="vide">{{ t('timeline.vide-placement') }}</p>
      <p v-else-if="!store.etapes.length" class="vide">{{ t('timeline.vide') }}</p>
      <div v-for="ph in phases" v-show="store.phase === 'tour'" :key="ph.id" class="phase" :class="{ courante: store.acteur?.id === ph.id }">
        <p class="nom"><span class="puce" />{{ ph.nom }}<span class="ressources">· {{ ph.ressources }}</span></p>
        <ol v-if="ph.lignes.length">
          <li v-for="l in ph.lignes" :key="l.index">
            <button
              type="button"
              class="ligne"
              :class="{ regardee: store.vue !== null && regardee === l.index }"
              :data-index="l.index"
              :aria-current="store.vue !== null && regardee === l.index ? 'step' : undefined"
              :title="t('timeline.voir', { n: l.index + 1 })"
              @click="store.regarder(l.index)"
            >
              <span class="numero">{{ l.index + 1 }}</span>
              <span class="texte">
                {{ l.texte }}
                <span v-for="(d, i) in l.details" :key="i" class="detail">{{ d }}</span>
              </span>
              <span class="res" :class="{ infecte: l.infecte }">{{ l.res }}</span>
            </button>
          </li>
        </ol>
      </div>
    </div>

    <div v-if="store.etapes.length" class="navigation" :aria-label="t('timeline.revoir')">
      <button type="button" :aria-label="t('timeline.precedente')" :disabled="regardee <= 0" @click="store.regarder(regardee - 1)">◀</button>
      <span>{{ store.vue === null ? t('timeline.present') : t('timeline.action', { n: store.vue + 1, total: store.etapes.length }) }}</span>
      <button type="button" :aria-label="t('timeline.suivante')" :disabled="store.vue === null" @click="store.regarder(regardee + 1)">▶</button>
      <button type="button" class="present" :disabled="store.vue === null" @click="store.regarder(null)">{{ t('timeline.revenir') }}</button>
    </div>

    <div class="boutons">
      <button type="button" :disabled="!store.actions.length" @click="store.annuler()">{{ t('timeline.annuler') }}</button>
      <!-- En mode infini, toujours possible : on passe en training sur cette salle (la run s'arrête) -->
      <button
        type="button"
        :disabled="!store.actions.length && store.mode !== 'infini'"
        :title="store.mode === 'infini' ? t('timeline.rejouer-infini') : undefined"
        @click="store.rejouerSalle()"
      >
        {{ t('timeline.rejouer') }}
      </button>
      <button type="button" :disabled="store.phase === 'placement'" @click="store.replacer()">{{ t('timeline.replacer') }}</button>
    </div>
    <button type="button" class="fin" :disabled="!bouton.actif" @click="bouton.action()">{{ bouton.texte }}</button>

    <dialog ref="dialogue" class="resultat" aria-labelledby="titre-resultat">
      <template v-if="store.score">
        <h2 id="titre-resultat">{{ store.score.etoiles === 4 ? t('resultat.tient') : store.score.etoiles ? t('resultat.reussie') : t('resultat.echec') }}</h2>
        <Etoiles :nombre="store.score.etoiles" grand />
        <p>{{ t('resultat.bilan', { n: store.score.infectes, total: store.score.total, pa: store.score.paDepenses }) }}</p>
        <p v-if="store.score.part === 1" class="fixation" :class="{ ok: store.score.etoiles === 4 }">
          <template v-if="store.score.etoiles === 4">{{ t('resultat.tous-tour-2') }}</template>
          <template v-else>
            {{ t('resultat.tour-2', { n: store.score.auTour2, total: store.score.total }) }}
            {{ t('resultat.conseil-tour-2') }}
          </template>
        </p>
        <p class="points">
          <strong>{{ t('resultat.points', { n: store.score.points }) }}</strong>
          <span v-if="store.score.part === 1">({{ t('resultat.detail', { pts: POINTS_PAR_PA, pa: store.score.paComptes }) }}<template v-if="store.score.etoiles === 4">{{ t('resultat.detail-tour-2', { n: POINTS_TOUR_2 }) }}</template>)</span>
          <span v-else>{{ t('resultat.sans-bonus') }}</span>
          <span v-if="store.prycipithon">{{ t('resultat.prycipithon') }}</span>
        </p>
        <p v-if="store.score.points > 0 && (!store.recordPrecedent || store.score.points > store.recordPrecedent.points)" class="record nouveau">
          {{ t('resultat.nouveau-record') }}<template v-if="store.recordPrecedent"> {{ t('resultat.ancien-record', { n: store.recordPrecedent.points }) }}</template>
        </p>
        <p v-else-if="store.recordPrecedent" class="record">{{ t('resultat.record', { n: store.recordPrecedent.points, pa: store.recordPrecedent.paDepenses }) }}</p>
        <p v-if="store.mode === 'infini' && !store.peutAvancer" class="bloque">{{ t('resultat.bloque', { n: ETOILES_POUR_AVANCER }) }}</p>
        <div class="boutons">
          <button type="button" @click="dialogue?.close()">{{ t('resultat.revoir') }}</button>
          <!-- Mode infini : rejouer passe en training sur cette salle (la run s'arrête) -->
          <button v-if="store.mode === 'infini'" type="button" :title="t('timeline.rejouer-infini')" @click="store.rejouerSalle()">{{ t('timeline.rejouer') }}</button>
          <!-- Training : on retravaille la même salle -->
          <button v-else-if="store.mode !== 'daily'" type="button" :title="t('resultat.recommencer-aide')" @click="store.replacer()">{{ t('resultat.recommencer') }}</button>
        </div>
        <!-- Défi du jour : tous les scores du jour, puis on retente depuis le placement -->
        <section v-if="store.mode === 'daily'" class="top-daily" aria-labelledby="titre-top-daily">
          <h3 id="titre-top-daily">{{ t('daily.classement') }}</h3>
          <p v-if="store.score.etoiles < ETOILES_DAILY" class="sans-etoile">{{ t('daily.etoile-requise', { n: ETOILES_DAILY }) }}</p>
          <Classement />
        </section>
        <button v-if="store.mode === 'daily'" type="button" class="fin" @click="store.replacer()">{{ t('daily.retenter') }}</button>
        <template v-else-if="store.mode === 'infini'">
          <button v-if="store.peutAvancer" type="button" class="fin" @click="store.salleSuivante()">{{ t('resultat.suivante') }}</button>
          <button v-else type="button" class="fin" @click="store.nouvelleRun()">{{ t('resultat.nouvelle-run') }}</button>
        </template>
        <button v-else type="button" class="fin" :title="t('resultat.rejouer-aide')" @click="store.rejouerSalle()">{{ t('timeline.rejouer') }}</button>
      </template>
    </dialog>
  </section>
</template>

<style scoped>
.timeline { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.entete { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
h2 { margin: 0; font-family: var(--police-titre); font-size: 20px; font-weight: 400; color: var(--or-clair); }
.tour { font-size: 12px; color: var(--texte-gris); font-weight: 700; }

.liste { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 10px; }
.vide { margin: 0; font-size: 13px; color: var(--texte-gris); line-height: 1.4; }
.phase { display: flex; flex-direction: column; gap: 6px; }
.nom { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; color: #c9a5f0; }
.phase:first-child .nom { color: #9fd27a; }
.courante .nom { text-decoration: underline; text-decoration-color: var(--or); text-underline-offset: 3px; }
.puce { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex: none; }
.ressources { font-weight: 600; color: var(--texte-gris); }

ol { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
.ligne {
  width: 100%; height: auto; display: flex; align-items: flex-start; gap: 8px; padding: 6px 8px; border-radius: 8px;
  background: var(--fond-creux); border: 1px solid #263b41; font-size: 13px; font-weight: 400; text-align: left;
}
.ligne.regardee { border-color: var(--or); background: #1d2a1f; }
.numero {
  width: 22px; height: 22px; flex: none; border-radius: 6px; background: var(--fond-bouton);
  display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: var(--or);
}
.texte { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; padding-top: 2px; }
.detail { font-size: 11px; color: var(--texte-gris); }
.res { font-size: 11px; font-weight: 800; color: var(--texte-gris); padding-top: 4px; white-space: nowrap; }
.res.infecte { color: #c9a5f0; }

.navigation { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 12px; font-weight: 700; color: var(--texte-doux); }
.navigation button { width: 34px; height: 30px; padding: 0; }
.navigation span { flex: 1; text-align: center; }
.navigation .present { width: auto; padding: 0 10px; }

.boutons { display: flex; gap: 8px; margin-top: 10px; }
.boutons button { flex: 1; }
button.fin { margin-top: 8px; width: 100%; }

.resultat {
  border-radius: 16px; border: 1px solid var(--or); background: linear-gradient(#18292f, #132227);
  color: var(--texte); padding: 24px 28px; text-align: center; width: var(--largeur-fenetre);
}
.resultat::backdrop { background: rgb(5 10 12 / 0.7); }
.resultat h2 { font-size: 26px; margin-bottom: 12px; }
.resultat p { margin: 12px 0 0; color: var(--texte-doux); }
.resultat .points { display: flex; flex-direction: column; gap: 2px; }
.resultat .points strong { font-size: 22px; color: var(--or-clair); }
.resultat .points span { font-size: 12px; color: var(--texte-gris); }
.resultat .record { font-size: 13px; }
.resultat .bloque { font-size: 13px; color: #ffd9cf; }
.resultat .fixation { font-size: 13px; }
.resultat .fixation.ok { color: var(--mandragore); font-weight: 800; }
.resultat .record.nouveau { color: #9fd27a; font-weight: 800; }
.top-daily { margin: 12px 0 4px; text-align: left; }
.top-daily h3 { margin: 0 0 6px; font-size: 14px; font-weight: 800; color: var(--or-clair); }
.sans-etoile { margin: 0 0 6px; font-size: 12px; color: var(--texte-gris); }
</style>
