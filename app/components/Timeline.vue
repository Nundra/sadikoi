<script setup lang="ts">
import { POINTS_PAR_PA, POINTS_TOUR_2 } from '~~/engine/partie'
import { ETOILES_POUR_AVANCER } from '~/stores/partie'
import { invocation, sort as trouverSort } from '~~/engine/sorts'

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

/** « Ennemi 2 » devient le monstre dessiné sur le plateau : « Piou Bleu (E2) ». */
function nommer(texte: string): string {
  return texte.replace(/Ennemi (\d+)/g, (_, n) => store.nomAffiche({ id: Number(n), genre: 'ennemi', nom: '', case: 0, pa: 0, pm: 0 }))
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
      phase = { id: a.id, nom: a.nom, ressources: '', lignes: [] }
      out.push(phase)
    }
    const prec = avant.entites.find(e => e.id === a.id)!
    const [titre, ...details] = bilan.texte
    phase.lignes.push({
      index,
      texte: nommer(titre!.replace(`${a.nom} : `, '').replace(`${a.nom} → `, 'Déplacement → ')),
      details: details.map(nommer),
      res: bilan.infectes.length ? `+${bilan.infectes.length} infecté${bilan.infectes.length > 1 ? 's' : ''}`
        : bilan.mandragores.length ? `${bilan.mandragores.length} sous Mandragore`
        : action.type === 'sort' ? `${trouverSort(action.sort).pa} PA`
          : action.type === 'deplacement' ? `${prec.pm - a.pm} PM` : '',
      infecte: bilan.infectes.length > 0 || bilan.mandragores.length > 0,
    })
  })
  // Ce qui reste à chacun, et les invocations qui n'ont pas encore agi
  for (const id of p.ordre) {
    const e = p.entites.find(x => x.id === id)
    let phase = out.find(x => x.id === id)
    if (!phase) {
      if (!e) continue
      phase = { id, nom: e.nom, ressources: '', lignes: [] }
      out.push(phase)
    }
    if (!e) {
      phase.ressources = 'a quitté le combat'
      continue
    }
    const max = e.genre === 'sadida' ? p.stats : invocation(e.monstre!)
    phase.ressources = `${e.pa} / ${max.pa} PA · ${e.pm} / ${max.pm} PM${phase.lignes.length ? '' : ' · à jouer'}`
  }
  return out
})

const bouton = computed(() => {
  if (store.phase === 'placement') return { texte: 'Valider le placement', action: store.validerPlacement, actif: store.sadida !== null }
  if (store.termine) return { texte: 'Voir le résultat', action: () => dialogue.value?.showModal(), actif: true }
  const a = store.acteur
  return { texte: `Fin du tour${a ? ` de ${a.nom}` : ''}`, action: store.finDuTour, actif: Boolean(a) && store.vue === null }
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
      <h2 id="titre-timeline">Timeline du tour</h2>
      <span class="tour">{{ store.phase === 'placement' ? 'Placement' : 'Tour 1' }}</span>
    </div>

    <div ref="liste" class="liste">
      <p v-if="store.phase === 'placement'" class="vide">
        Clique une case bleue pour placer le Sadida, puis valide le placement pour commencer le tour.
      </p>
      <p v-else-if="!store.etapes.length" class="vide">
        Aucune action. Choisis un sort dans la barre, puis une case ; clique une case verte pour te déplacer.
        « Fin du tour » passe la main à l’invocation suivante.
      </p>
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
              :title="`Voir le plateau après l’action ${l.index + 1}`"
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

    <div v-if="store.etapes.length" class="navigation" aria-label="Revoir les actions">
      <button type="button" aria-label="Action précédente" :disabled="regardee <= 0" @click="store.regarder(regardee - 1)">◀</button>
      <span>{{ store.vue === null ? 'Présent' : `Action ${store.vue + 1} / ${store.etapes.length}` }}</span>
      <button type="button" aria-label="Action suivante" :disabled="store.vue === null" @click="store.regarder(regardee + 1)">▶</button>
      <button type="button" class="present" :disabled="store.vue === null" @click="store.regarder(null)">Revenir au présent</button>
    </div>

    <div class="boutons">
      <button type="button" :disabled="!store.actions.length" @click="store.annuler()">Annuler</button>
      <!-- En mode infini, toujours possible : on passe en training sur cette salle (la run s'arrête) -->
      <button
        type="button"
        :disabled="!store.actions.length && store.mode !== 'infini'"
        :title="store.mode === 'infini' ? 'Passe en training sur cette salle : la run s’arrête' : undefined"
        @click="store.rejouerSalle()"
      >
        Rejouer la salle
      </button>
      <button type="button" :disabled="store.phase === 'placement'" @click="store.replacer()">Replacer</button>
    </div>
    <button type="button" class="fin" :disabled="!bouton.actif" @click="bouton.action()">{{ bouton.texte }}</button>

    <dialog ref="dialogue" class="resultat" aria-labelledby="titre-resultat">
      <template v-if="store.score">
        <h2 id="titre-resultat">{{ store.score.etoiles === 4 ? 'Infection qui tient !' : store.score.etoiles ? 'Salle réussie' : 'Échec' }}</h2>
        <Etoiles :nombre="store.score.etoiles" grand />
        <p>{{ store.score.infectes }} ennemi{{ store.score.infectes > 1 ? 's' : '' }} infecté{{ store.score.infectes > 1 ? 's' : '' }} sur {{ store.score.total }}, {{ store.score.paDepenses }} PA dépensé{{ store.score.paDepenses > 1 ? 's' : '' }}.</p>
        <p v-if="store.score.part === 1" class="fixation" :class="{ ok: store.score.etoiles === 4 }">
          <template v-if="store.score.etoiles === 4">Tous encore infectés au tour 2 : l’infection tient.</template>
          <template v-else>
            {{ store.score.auTour2 }} / {{ store.score.total }} encore infecté{{ store.score.auTour2 > 1 ? 's' : '' }} au tour 2.
            Pour la 4e étoile : une infection du Sadida d'au moins 2 tours (Contagion, Sacrifice Vaudou, Sève Paralysante, Cigüe…),
            une infection posée par une invocation (elle expire au début de son tour, après celui du Sadida),
            ou Mandragore sur un Infecté une fois tout le monde infecté.
          </template>
        </p>
        <p class="points">
          <strong>{{ store.score.points }} points</strong>
          <span v-if="store.score.part === 1">(100 + {{ POINTS_PAR_PA }} × {{ store.score.paRestants }} PA restant{{ store.score.paRestants > 1 ? 's' : '' }}<template v-if="store.score.etoiles === 4"> + {{ POINTS_TOUR_2 }} tour 2</template>)</span>
          <span v-else>(bonus de PA seulement si tous les ennemis sont infectés)</span>
          <span v-if="store.prycipithon">Prycipithon Mate : points × 0,9</span>
        </p>
        <p v-if="store.score.points > 0 && (!store.recordPrecedent || store.score.points > store.recordPrecedent.points)" class="record nouveau">
          Nouveau record sur cette salle !<template v-if="store.recordPrecedent"> Ancien : {{ store.recordPrecedent.points }} points.</template>
        </p>
        <p v-else-if="store.recordPrecedent" class="record">Record sur cette salle : {{ store.recordPrecedent.points }} points ({{ store.recordPrecedent.paDepenses }} PA).</p>
        <p v-if="store.mode === 'infini' && !store.peutAvancer" class="bloque">
          Il faut {{ ETOILES_POUR_AVANCER }} étoiles pour passer à la salle suivante : rejoue la salle,
          ou recommence la run si elle te paraît impossible.
        </p>
        <div class="boutons">
          <button type="button" @click="dialogue?.close()">Revoir le tour</button>
          <button type="button" :title="store.mode === 'infini' ? 'Passe en training sur cette salle : la run s’arrête' : undefined" @click="store.rejouerSalle()">Rejouer la salle</button>
        </div>
        <button v-if="store.peutAvancer" type="button" class="fin" @click="store.salleSuivante()">Salle suivante</button>
        <button v-else type="button" class="fin" @click="store.nouvelleRun()">Recommencer la run</button>
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
  color: var(--texte); padding: 24px 28px; text-align: center; min-width: 360px; max-width: min(480px, 92vw);
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
</style>
