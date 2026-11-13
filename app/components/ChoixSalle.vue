<script setup lang="ts">
import type { MapCombat } from '~~/engine/plateau'
import { langue, nomJeu, t } from '~/i18n'
import type { Mode } from '~/stores/partie'

/**
 * Choix du mode et de la map, dans un coin du plateau. La map se choisit dans une liste
 * déroulante avec recherche : en « map spécifique », parmi les types de map cochés dans
 * les réglages ; en « boss », parmi les salles de boss.
 */
const store = usePartieStore()

const MAX_RESULTATS = 60

const sansAccents = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** Libellé d'une map dans la langue choisie (ou en français, avec `traduire` à faux). */
function libelle(m: MapCombat, traduire = true): string {
  const n = traduire ? nomJeu : (x: string) => x
  if (store.mode === 'boss') return `${n(m.donjon!)} · ${m.boss!.map(n).join(', ')}`
  return m.nom === m.sous_zone ? n(m.nom) : `${n(m.nom)} · ${n(m.sous_zone)}`
}

/** Texte cherché : libellé et zone (dans la langue choisie et en français), donjon et id. */
const index = computed(() => (store.mode === 'boss' ? store.mapsBoss : store.mapsActives)
  .map(m => ({
    m,
    nom: libelle(m),
    texte: sansAccents([libelle(m), nomJeu(m.zone), libelle(m, false), m.zone, m.donjon ?? '', m.id].join(' ')),
  }))
  .sort((a, b) => a.nom.localeCompare(b.nom, langue.value)))

const ouvert = ref(false)
const recherche = ref('')
const actif = ref(0)
const champ = ref<HTMLInputElement | null>(null)
const liste = ref<HTMLElement | null>(null)

const resultats = computed(() => {
  const mots = sansAccents(recherche.value).split(/\s+/).filter(Boolean)
  return index.value.filter(x => mots.every(mot => x.texte.includes(mot))).slice(0, MAX_RESULTATS).map(x => x.m)
})
const total = computed(() => {
  const mots = sansAccents(recherche.value).split(/\s+/).filter(Boolean)
  return index.value.filter(x => mots.every(mot => x.texte.includes(mot))).length
})

watch(recherche, () => (actif.value = 0))

function ouvrir() {
  recherche.value = ''
  ouvert.value = true
  actif.value = Math.max(0, resultats.value.findIndex(m => m.id === store.map?.id))
  nextTick(() => {
    champ.value?.focus()
    liste.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  })
}

function fermer() {
  ouvert.value = false
}

function choisir(m: MapCombat | undefined) {
  if (!m) return
  store.mapChoisie = m.id
  store.nouvelleSalle()
  fermer()
}

function surTouche(ev: KeyboardEvent) {
  if (ev.key === 'ArrowDown') actif.value = Math.min(actif.value + 1, resultats.value.length - 1)
  else if (ev.key === 'ArrowUp') actif.value = Math.max(actif.value - 1, 0)
  else if (ev.key === 'Enter') choisir(resultats.value[actif.value])
  else if (ev.key === 'Escape') fermer()
  else return
  ev.preventDefault()
  nextTick(() => liste.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }))
}

function changerMode(ev: Event) {
  const choisi = (ev.target as HTMLSelectElement).value as Mode
  fermer()
  if (choisi === 'creation') return store.ouvrirCreation()
  store.mode = choisi
  store.mapChoisie = null
  if (store.mode === 'infini') store.nouvelleRun()
  else store.nouvelleSalle()
}

// Clic en dehors : on referme
const racine = ref<HTMLElement | null>(null)
function clicDehors(ev: MouseEvent) {
  if (ouvert.value && racine.value && !racine.value.contains(ev.target as Node)) fermer()
}
onMounted(() => document.addEventListener('mousedown', clicDehors))
onBeforeUnmount(() => document.removeEventListener('mousedown', clicDehors))
</script>

<template>
  <div ref="racine" class="choix-salle">
    <label class="sr-only" for="choix-mode">{{ t('choix.mode') }}</label>
    <select id="choix-mode" :value="store.mode" @change="changerMode">
      <option value="infini">{{ t('choix.infini') }}</option>
      <option value="map">{{ t('choix.map') }}</option>
      <option value="boss">{{ t('choix.boss') }}</option>
      <option value="creation">{{ t('choix.creation') }}</option>
    </select>

    <button v-if="store.mode === 'creation' && !store.edition" type="button" class="editer" :title="t('creation.modifier-aide')" @click="store.modifierCarte()">
      <span class="crayon" aria-hidden="true">✎</span>{{ t('creation.modifier') }}
    </button>
    <div v-if="store.mode === 'map' || store.mode === 'boss'" class="combo">
      <button
        v-if="!ouvert"
        type="button"
        class="courante"
        :aria-label="t('choix.changer', { map: store.map ? libelle(store.map) : t('choix.aucune') })"
        @click="ouvrir"
      >
        <span>{{ store.map ? libelle(store.map) : t('choix.choisir') }}</span>
        <span class="chevron" aria-hidden="true">▾</span>
      </button>
      <template v-else>
        <input
          id="choix-map"
          ref="champ"
          v-model="recherche"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls="liste-maps"
          :aria-activedescendant="resultats[actif] ? `map-${resultats[actif]!.id}` : undefined"
          :placeholder="store.mode === 'boss' ? t('choix.chercher-boss') : t('choix.chercher-map')"
          autocomplete="off"
          @keydown="surTouche"
        >
        <ul id="liste-maps" ref="liste" role="listbox" :aria-label="store.mode === 'boss' ? t('choix.liste-boss') : t('choix.liste-maps')">
          <li
            v-for="(m, k) in resultats"
            :id="`map-${m.id}`"
            :key="m.id"
            role="option"
            :aria-selected="k === actif"
            :class="{ courante: m.id === store.map?.id }"
            @mousemove="actif = k"
            @mousedown.prevent="choisir(m)"
          >
            <span class="nom">{{ libelle(m) }}</span>
            <span class="zone">{{ nomJeu(m.zone) }}</span>
          </li>
          <li v-if="!resultats.length" class="vide" role="presentation">{{ t('choix.aucun-resultat') }}</li>
          <li v-else-if="total > resultats.length" class="vide" role="presentation">
            {{ t('choix.autres', { n: total - resultats.length }) }}
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<style scoped>
.choix-salle {
  position: absolute; top: 12px; left: 12px; z-index: 3; width: 320px;
  display: flex; flex-direction: column; gap: 6px;
}
select, input, .courante {
  width: 100%; height: 36px; padding: 0 10px; border-radius: 8px; background: rgb(10 19 23 / 0.92);
  color: var(--texte); border: 1px solid var(--bord-clair); font: inherit; font-size: 13px; font-weight: 700;
}
select:hover, .courante:hover { border-color: var(--or); }
input { border-color: var(--or); }
.courante { display: flex; align-items: center; justify-content: space-between; gap: 8px; text-align: left; }
.courante span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chevron { color: var(--or); }
.editer { display: flex; align-items: center; justify-content: center; gap: 8px; border-color: var(--or); color: var(--or-clair); }
.crayon { font-size: 15px; }
.combo { position: relative; }
ul {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0; max-height: 320px; overflow: auto;
  margin: 0; padding: 4px; list-style: none; border-radius: 8px; background: #0b1418; border: 1px solid var(--or);
  box-shadow: 0 8px 20px rgb(0 0 0 / 0.6);
}
li { display: flex; flex-direction: column; padding: 5px 8px; border-radius: 6px; cursor: pointer; }
li[aria-selected='true'] { background: #22363c; }
li.courante .nom { color: var(--or-clair); }
.nom { font-size: 13px; font-weight: 700; color: var(--texte); }
.zone { font-size: 11px; color: var(--texte-gris); }
.vide { cursor: default; font-size: 12px; color: var(--texte-gris); }
</style>
