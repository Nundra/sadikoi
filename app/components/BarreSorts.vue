<script setup lang="ts">
import type { Sort } from '~~/engine/sorts'
import { useBarreStore } from '~/stores/barre'
import { PAIRES } from '~/stores/partie'
import { infectionDuSort, nomSort, t } from '~/i18n'

const store = usePartieStore()
const barre = useBarreStore()

/** On réorganise seulement la barre du Sadida (celle des invocations est fixe). */
const reorganisable = computed(() => store.acteur?.genre !== 'invocation')

const sorts = computed(() => store.sortsActeur.map((s, k) => {
  const element = elementDuSort(s)
  return {
    s,
    k,
    touche: barre.libelle(barre.touches[k] ?? ''),
    couleur: COULEUR_ELEMENT[element],
    nom: nomSort(s.id),
    autre: s.variante_de ? nomSort(s.variante_de.id) : null,
    indisponible: Boolean(s.relance_initiale) || (store.acteur?.pa ?? store.statsDepart.pa) < s.pa,
    variante: store.acteur?.genre !== 'invocation' && !estPremiere(s),
    description: descriptionUtile(s),
    contraintes: [
      s.ligne_de_vue === false ? t('sort.sans-ldv') : null,
      s.en_ligne ? t('sort.en-ligne') : null,
      s.en_diagonale ? t('sort.en-diagonale') : null,
      s.case_libre ? t('sort.case-libre') : null,
      s.lancers_par_tour ? t('sort.par-tour', { n: s.lancers_par_tour }) : null,
      s.lancers_par_cible ? t('sort.par-cible', { n: s.lancers_par_cible }) : null,
      s.relance_initiale ? t('sort.pas-tour-1') : null,
    ].filter(Boolean).join(' · '),
  }
}))

/** Le sort est le premier de sa paire ; sinon le bouton ⇄ est allumé. */
function estPremiere(s: Sort): boolean {
  return PAIRES.find(([a]) => a.paire === s.paire)?.[0].id === s.id
}

// Glisser-déposer : on échange l'emplacement de départ et celui d'arrivée
const depuis = ref<number | null>(null)
const survole = ref<number | null>(null)

function deposer(k: number) {
  if (depuis.value !== null) barre.echanger(depuis.value, k)
  depuis.value = null
  survole.value = null
}
</script>

<template>
  <nav class="panneau barre" :aria-label="t('barre.nom', { e: store.acteur ? store.nomAffiche(store.acteur) : 'Sadida' })">
    <div
      v-for="x in sorts"
      :key="x.s.id"
      class="emplacement"
      :class="{ cible: survole === x.k && depuis !== x.k, deplace: depuis === x.k }"
      @dragover.prevent="survole = x.k"
      @dragleave="survole === x.k && (survole = null)"
      @drop.prevent="deposer(x.k)"
    >
      <button
        type="button"
        class="sort"
        :class="{ indisponible: x.indisponible }"
        :style="{ '--couleur': x.couleur }"
        :aria-label="x.touche ? t('barre.bouton-touche', { nom: x.nom, pa: x.s.pa, touche: x.touche }) : t('barre.bouton', { nom: x.nom, pa: x.s.pa })"
        :aria-pressed="store.sortChoisi === x.s.id"
        :draggable="reorganisable"
        @dragstart="(ev) => { depuis = x.k; ev.dataTransfer?.setData('text/plain', String(x.k)) }"
        @dragend="depuis = null; survole = null"
        @click="store.choisirSort(x.s.id)"
      >
        <img :src="`/sorts/${x.s.id}.png`" alt="" class="icone" draggable="false">
        <span class="pa">{{ x.s.pa }}</span>
        <span v-if="x.touche" class="touche" aria-hidden="true">{{ x.touche }}</span>
      </button>
      <div class="infobulle" :class="x.k % 11 < 3 ? 'a-gauche' : x.k % 11 > 7 ? 'a-droite' : ''" aria-hidden="true">
        <div class="titre">
          <img :src="`/sorts/${x.s.id}.png`" alt="">
          <div>
            <strong>{{ x.nom }}</strong>
            <span class="carac">{{ t('sort.pa', { n: x.s.pa }) }} · {{ t('sort.po', { po: porteeDuSort(x.s, store.bonusPo) }) }}{{ x.s.po_modifiable ? t('sort.modifiable') : '' }}</span>
          </div>
        </div>
        <p v-if="x.contraintes" class="contraintes">{{ x.contraintes }}</p>
        <p v-for="(para, i) in x.description" :key="i" class="description">{{ para }}</p>
        <p class="infection"><span>{{ t('sort.infection') }}</span>{{ infectionDuSort(x.s) }}</p>
        <p class="aide">{{ x.touche ? t('barre.touche', { touche: x.touche }) : t('barre.sans-touche') }}<template v-if="reorganisable">{{ t('barre.glisser') }}</template></p>
      </div>
      <button
        v-if="x.autre"
        type="button"
        class="variante"
        :class="{ active: x.variante }"
        :disabled="store.verrouille"
        :aria-label="t('barre.variante', { nom: x.autre })"
        :title="store.verrouille ? t('barre.verrouille') : t('barre.variante', { nom: x.autre })"
        @click="store.changerVariante(x.s.paire!)"
      >
        <span class="fleches" aria-hidden="true" />
      </button>
    </div>
  </nav>
</template>

<style scoped>
.barre {
  flex: 1; min-width: 0; display: grid; grid-template-columns: repeat(11, minmax(0, 1fr));
  column-gap: 10px; row-gap: 8px; align-content: center;
}
.emplacement { position: relative; height: 60px; display: flex; justify-content: center; border-radius: 8px; }
.emplacement.cible { outline: 2px dashed var(--or-clair); outline-offset: 2px; }
.emplacement.deplace { opacity: 0.4; }
/* Fiche du sort au survol (ou au focus clavier), sans attendre l'info-bulle du navigateur */
.infobulle {
  position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%); z-index: 5;
  display: none; flex-direction: column; gap: 6px; width: 320px; padding: 10px 12px; border-radius: 10px;
  background: #0b1418; border: 1px solid var(--or); pointer-events: none; text-align: left;
  font-size: 12px; line-height: 1.4; color: var(--texte-doux); box-shadow: 0 6px 18px rgb(0 0 0 / 0.6);
}
.infobulle.a-gauche { left: 0; transform: none; }
.infobulle.a-droite { left: auto; right: 0; transform: none; }
.infobulle .titre { display: flex; align-items: center; gap: 8px; }
.infobulle .titre img { width: 36px; height: 36px; border-radius: 6px; border: 1px solid var(--or); }
.infobulle .titre div { display: flex; flex-direction: column; }
.infobulle strong { font-size: 14px; color: var(--or-clair); }
.infobulle .carac, .infobulle .contraintes, .infobulle .aide { font-size: 11px; color: var(--texte-gris); font-weight: 700; }
.infobulle p { margin: 0; }
.infobulle .description { white-space: pre-line; }
.infobulle .infection { padding: 6px 8px; border-radius: 6px; background: rgb(122 63 184 / 0.18); border: 1px solid rgb(201 165 240 / 0.35); }
.infobulle .infection span { display: block; font-size: 10px; font-weight: 800; color: #c9a5f0; text-transform: uppercase; letter-spacing: 0.5px; }
.emplacement:hover .infobulle, .emplacement:has(.sort:focus-visible) .infobulle { display: flex; }
.emplacement.deplace .infobulle, .emplacement.cible .infobulle { display: none; }
/* L'icône du jeu suffit : pas de cadre */
.sort {
  position: relative; width: 60px; height: 60px; padding: 0; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  background: none; border: 0; box-shadow: 0 3px 6px rgb(0 0 0 / 0.45);
}
.sort[draggable='true'] { cursor: grab; }
/* Sort choisi : un halo, pas de bordure */
.sort[aria-pressed='true'] { box-shadow: 0 0 0 2px rgb(240 205 133 / 0.9), 0 0 16px rgb(240 205 133 / 0.55); }
.sort.indisponible { filter: grayscale(0.8) brightness(0.6); }
.icone { width: 100%; height: 100%; border-radius: 8px; object-fit: cover; pointer-events: none; }
/* Coût en PA sur l'étoile bleue du jeu */
.pa {
  position: absolute; left: -7px; bottom: -7px; width: 26px; height: 26px;
  background: url('/icones/pa.png') center / contain no-repeat;
  font-size: 11px; font-weight: 800; color: #fff; text-shadow: 0 1px 2px #0b2a44;
  display: flex; align-items: center; justify-content: center; padding-top: 1px;
}
.touche {
  position: absolute; right: 2px; bottom: 2px; min-width: 16px; height: 16px; padding: 0 3px; border-radius: 4px;
  background: rgb(10 19 23 / 0.85); border: 1px solid var(--bord-clair);
  font-size: 10px; font-weight: 800; color: var(--or-clair); display: flex; align-items: center; justify-content: center;
}
/* Bouton de variante collé dans l'angle haut-droit de l'icône, flèches « exchange » du jeu */
.variante {
  position: absolute; right: calc(50% - 34px); top: -4px; width: 20px; height: 20px; padding: 0; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: #0e1c22; color: var(--or); border: 1px solid var(--or); box-shadow: 0 1px 3px rgb(0 0 0 / 0.6);
}
.variante.active { background: linear-gradient(#e7bf68, #c9963c); color: #2a1d08; }
.variante:disabled { opacity: 0.35; cursor: not-allowed; }
.fleches { width: 12px; height: 12px; background: currentColor; mask: url('/icones/variante.png') center / contain no-repeat; -webkit-mask: url('/icones/variante.png') center / contain no-repeat; }
</style>
