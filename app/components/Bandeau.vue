<script setup lang="ts">
import type { Mode } from '~/stores/partie'

const store = usePartieStore()

const NOMS_MODE: Record<Mode, string> = { infini: 'Mode infini', map: 'Training map', boss: 'Training boss' }

const pourcentage = computed(() => `${Math.round((store.score?.part ?? 0) * 100)}%`)

const mapsTriees = computed(() => [...store.mapsActives].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')))
const reglages = ref<{ ouvrir: () => void } | null>(null)
const bienvenue = ref<{ ouvrir: () => void } | null>(null)
const libelleMap = (m: { nom: string, sous_zone: string, id: number }) => `${m.nom}${m.nom === m.sous_zone ? '' : ` · ${m.sous_zone}`} (${m.id})`

// Saisie dans la liste des maps : on garde l'id entre parenthèses à la fin
const saisie = ref('')
// Aussi quand on passe en training sur la salle en cours (« Rejouer la salle » depuis le mode infini)
watch(() => [store.map, store.mode] as const, ([m, mode]) => {
  if (m && mode === 'map') saisie.value = libelleMap(m)
}, { immediate: true })

function changerMode(ev: Event) {
  store.mode = (ev.target as HTMLSelectElement).value as Mode
  store.mapChoisie = null
  if (store.mode === 'infini') store.nouvelleRun()
  else store.nouvelleSalle()
}

function choisirMap() {
  const id = Number(/\((\d+)\)$/.exec(saisie.value)?.[1])
  if (!store.maps.some(m => m.id === id)) return
  store.mapChoisie = id
  store.nouvelleSalle()
}

function choisirBoss(ev: Event) {
  store.mapChoisie = Number((ev.target as HTMLSelectElement).value)
  store.nouvelleSalle()
}
</script>

<template>
  <header class="bandeau">
    <h1 class="titre"><img src="/logo.png" alt="Sadikoi" width="140" height="58"></h1>

    <div class="pilule">
      <span class="mode">{{ NOMS_MODE[store.mode] }}</span><span aria-hidden="true">·</span><span>Salle {{ store.numeroSalle }}</span>
      <template v-if="store.mode === 'infini' && store.meilleureSerie">
        <span aria-hidden="true">·</span><span class="record" title="Plus longue run : salles réussies à 3 étoiles ou plus, d'affilée">record {{ store.meilleureSerie }}</span>
      </template>
    </div>

    <div class="objectif">
      <div class="map-courante">
        <span>Objectif : tout infecter au T1 · 4e étoile si ça tient au T2</span>
        <span v-if="store.map" class="nom-map">
          {{ store.map.nom }}<template v-if="store.map.boss"> · boss : {{ store.map.boss.join(', ') }}</template>
        </span>
        <span v-if="store.map" class="lieu">
          {{ [store.map.zone, store.map.sous_zone !== store.map.nom ? store.map.sous_zone : null].filter(Boolean).join(' · ') }}
          <template v-if="!store.map.donjon"> · [{{ store.map.pos[0] }}, {{ store.map.pos[1] }}]</template>
        </span>
      </div>
      <div v-if="store.score" class="progression">
        <div class="jauge" aria-hidden="true"><div :style="{ width: pourcentage }" /></div>
        <span class="compte">{{ store.score.infectes }} / {{ store.score.total }}</span>
        <Etoiles :nombre="store.score.etoiles" />
        <span class="points">{{ store.score.points }} pts</span>
        <span v-if="store.record" class="record" :title="`Record sur cette salle : ${store.record.points} points, ${store.record.paDepenses} PA`">record {{ store.record.points }}</span>
      </div>
    </div>

    <div class="choix">
      <label for="choix-mode">Mode</label>
      <select id="choix-mode" :value="store.mode" @change="changerMode">
        <option value="infini">Mode infini (aléatoire)</option>
        <option value="map">Training : map spécifique…</option>
        <option value="boss">Training : map de boss…</option>
      </select>
      <template v-if="store.mode === 'map'">
        <label for="choix-map" class="sr-only">Map</label>
        <input id="choix-map" v-model="saisie" list="liste-maps" placeholder="Chercher une map…" @change="choisirMap">
        <datalist id="liste-maps">
          <option v-for="m in mapsTriees" :key="m.id" :value="libelleMap(m)" />
        </datalist>
      </template>
      <template v-else-if="store.mode === 'boss'">
        <label for="choix-boss" class="sr-only">Salle de boss</label>
        <select id="choix-boss" :value="store.mapChoisie ?? ''" @change="choisirBoss">
          <option v-for="m in store.mapsBoss" :key="m.id" :value="m.id">{{ m.donjon }} · {{ m.boss!.join(', ') }}</option>
        </select>
      </template>
      <button v-if="store.mode === 'infini'" type="button" title="Recommence la run depuis la salle 1" @click="store.nouvelleRun()">Nouvelle run</button>
      <button v-else type="button" @click="store.nouvelleSalle()">Autres ennemis</button>
      <button type="button" :title="store.lienPartage ? `Copie le lien de cette salle : ${store.lienPartage}` : undefined" @click="store.partager()">Partager</button>
      <button type="button" class="engrenage" aria-label="Réglages" title="Réglages" @click="reglages?.ouvrir()">
        <span class="cle" aria-hidden="true" />
      </button>
      <button type="button" class="engrenage" aria-label="Aide : le principe et comment jouer" title="Aide" @click="bienvenue?.ouvrir()">
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
.compte { font-size: 14px; font-weight: 800; }
.points { font-size: 14px; font-weight: 800; color: var(--or-clair); }
.record { font-size: 12px; color: var(--texte-gris); font-weight: 700; }
.choix { display: flex; align-items: center; gap: 10px; }
.choix label { font-size: 13px; color: #b9c6c4; font-weight: 700; }
select, input {
  height: 40px; min-width: 220px; padding: 0 12px; border-radius: 10px; background: var(--fond-creux);
  color: var(--texte); border: 1px solid var(--or); font: inherit; font-size: 14px; font-weight: 700;
}
#choix-map { min-width: 300px; }
#choix-boss { max-width: 320px; }
.engrenage { width: 44px; padding: 0; display: flex; align-items: center; justify-content: center; }
.engrenage .interrogation { width: 22px; height: 22px; background: var(--or); mask: url('/icones/aide.png') center / contain no-repeat; }
/* Picto blanc du jeu, teinté en doré */
.engrenage .cle { width: 24px; height: 24px; background: var(--or); mask: url('/icones/reglages.png') center / contain no-repeat; }
</style>
