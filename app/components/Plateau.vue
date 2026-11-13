<script setup lang="ts">
import { COLONNES, NB_CASES } from '~~/engine/grille'
import { infecteAuTour2, type Entite } from '~~/engine/partie'
import { equipes } from '~~/engine/salle'

const store = usePartieStore()

// Une case fait 60 × 30 ; les rangées impaires sont décalées d'une demi-case.
const L = 60
const H = 30
function origine(c: number) {
  const r = Math.floor(c / COLONNES)
  return { x: (c % COLONNES) * L + (r % 2) * (L / 2), y: r * (H / 2) }
}
function losange(c: number) {
  const { x, y } = origine(c)
  return `${x + L / 2},${y} ${x + L},${y + H / 2} ${x + L / 2},${y + H} ${x},${y + H / 2}`
}
function centre(c: number) {
  const { x, y } = origine(c)
  return { x: x + L / 2, y: y + H / 2 }
}

const CLASSE: Record<string, string> = { '#': 'obstacle', 'x': 'muret', '_': 'sol' }

const cases = computed(() => {
  const m = store.map
  if (!m) return []
  // Tes cases toujours en bleu, celles des ennemis en rouge, quelle que soit leur couleur dans les données
  const { joueur } = equipes(m)
  const out = []
  for (let c = 0; c < NB_CASES; c++) {
    const k = m.cases[c]!
    if (k === '.') continue
    out.push({ c, points: losange(c), classe: `case-${k === 'r' || k === 'b' ? (k === joueur ? 'bleue' : 'rouge') : CLASSE[k]}`, damier: (c + Math.floor(c / COLONNES)) % 2 === 1 })
  }
  return out
})

/** Cadre serré sur les cases de la map (beaucoup de maps sont entourées de vide). */
const cadre = computed(() => {
  if (!cases.value.length) return '0 0 870 615'
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const { c } of cases.value) {
    const { x, y } = origine(c)
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x + L)
    y1 = Math.max(y1, y + H)
  }
  // marge en haut pour les pions et le badge « Infecté », en bas pour la légende
  return `${x0 - 12} ${y0 - 72} ${x1 - x0 + 24} ${y1 - y0 + 116}`
})

const placementLibre = computed(() => new Set(store.phase === 'placement' ? store.casesPlacement : []))

function etat(c: number): string | null {
  const a = store.apercu
  if (a.zone.has(c)) return 'zone'
  if (a.chemin.has(c)) return 'chemin'
  if (store.ciblables.has(c)) return 'portee'
  if (store.accessibles.has(c) && store.acteur?.case !== c) return 'accessible'
  if (placementLibre.value.has(c)) return 'placement'
  return null
}

const ABREGES: Record<string, string> = {
  'La Folle': 'Fo', 'La Sacrifiée': 'Sa', 'La Bloqueuse': 'Bl', 'La Gonflable': 'Go', 'La Surpuissante': 'Su', 'Groute': 'Gr', 'Tréant': 'Tr',
}

function libelle(e: Entite): string {
  if (e.genre === 'sadida') return 'S'
  if (e.genre === 'ennemi') return `E${e.id}`
  if (e.genre === 'arbre') return e.feuillu ? 'AF' : 'A'
  return ABREGES[e.nom] ?? e.nom.slice(0, 2)
}

const pions = computed(() => [...store.entites]
  .sort((a, b) => a.case - b.case)
  .map(e => ({
    e,
    ...centre(e.case),
    libelle: libelle(e),
    actif: store.interactif && store.acteur?.id === e.id,
    menace: store.apercu.infectes.has(e.id),
    tient: infecteAuTour2(e),
    // La Sadida est en pied (image avec plus de marge), les monstres en portrait
    taille: e.genre === 'sadida' ? 72 : 44,
  })))

/** Les déplacements de l'action affichée : case de départ en pointillés et flèche. */
const traces = computed(() => store.deplacements.map(d => ({ id: d.id, de: centre(d.de), vers: centre(d.vers) })))

function caseDe(ev: Event): number | null {
  const v = (ev.target as Element | null)?.getAttribute?.('data-case')
  return v === null || v === undefined ? null : Number(v)
}

const aide = computed(() => {
  if (store.vue !== null) return `Action ${store.vue + 1} : l’état du plateau juste après. Reviens au présent pour jouer.`
  if (store.phase === 'placement') return 'Placement : clique une case bleue pour placer le Sadida, puis valide le placement.'
  return null
})
</script>

<template>
  <section class="plateau" :class="{ passe: store.vue !== null }" aria-label="Plateau de combat">
    <svg
      :viewBox="cadre"
      role="img"
      :aria-label="store.map ? `Map ${store.map.nom}` : 'Chargement de la map'"
      @click="(ev) => { const c = caseDe(ev); if (c !== null) store.clicCase(c) }"
      @mouseover="(ev) => (store.survol = caseDe(ev))"
      @mouseleave="store.survol = null"
    >
      <defs>
        <marker id="fleche" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#f0cd85" />
        </marker>
      </defs>
      <g class="cases">
        <polygon
          v-for="k in cases"
          :key="k.c"
          :points="k.points"
          :data-case="k.c"
          :class="[k.classe, { damier: k.damier }, etat(k.c) && `etat-${etat(k.c)}`]"
        />
      </g>
      <g class="traces" aria-hidden="true">
        <g v-for="t in traces" :key="t.id">
          <ellipse :cx="t.de.x" :cy="t.de.y + 2" rx="16" ry="7" class="fantome" />
          <line :x1="t.de.x" :y1="t.de.y" :x2="t.vers.x" :y2="t.vers.y" marker-end="url(#fleche)" />
        </g>
      </g>
      <g class="pions" aria-hidden="true">
        <g
          v-for="p in pions"
          :key="p.e.id"
          :transform="`translate(${p.x} ${p.y})`"
          :class="['pion', `pion-${p.e.genre}`, { infecte: p.e.infecte, feuillu: p.e.feuillu, actif: p.actif, menace: p.menace }]"
        >
          <title>{{ store.nomAffiche(p.e) }}</title>
          <ellipse class="ombre" cx="0" cy="3" rx="17" ry="7" />
          <ellipse class="anneau" cx="0" cy="2" rx="18" ry="8" />
          <image :href="store.portrait(p.e)" :x="-p.taille / 2" :y="6 - p.taille" :width="p.taille" :height="p.taille" class="portrait" />
          <g class="etiquette" transform="translate(-12 4)">
            <rect x="0" y="0" width="24" height="12" rx="6" />
            <text x="12" y="9">{{ p.libelle }}</text>
          </g>
          <g v-if="p.e.infecte" class="badge" transform="translate(2 -50)">
            <!-- Contour par style : voir Etoiles.vue (Firefox et les classes SVG) -->
            <rect x="0" y="0" width="52" height="14" rx="7" :style="p.tient ? { stroke: 'var(--or-clair)', strokeWidth: 2 } : undefined" />
            <text x="26" y="10.5">Infecté {{ p.e.dureeInfection ?? 1 }}t</text>
          </g>
          <g v-if="p.e.mandragore" class="mandragore" transform="translate(-22 -36)">
            <circle cx="0" cy="0" r="8" />
            <text x="0" y="3.5">M</text>
          </g>
        </g>
      </g>
    </svg>

    <ChoixSalle />

    <ul class="legende">
      <li><span class="pastille bleue" />Placement (toi)</li>
      <li><span class="pastille rouge" />Placement (ennemis)</li>
      <li><span class="pastille portee" />Portée</li>
      <li><span class="pastille zone" />Zone du sort</li>
      <li><span class="pastille accessible" />Déplacement</li>
      <li><span class="pastille mandragore">M</span>Mandragore</li>
      <li><span class="pastille tient" />Infecté au tour 2</li>
    </ul>

    <p v-if="store.message" class="message" role="status">{{ store.message }}</p>
    <p v-else-if="aide" class="message aide" role="status">{{ aide }}</p>
  </section>
</template>

<style scoped>
.plateau {
  position: relative;
  min-width: 0;
  min-height: 0;
  border-radius: 18px;
  background: var(--fond-plateau);
  border: 1px solid var(--bord);
  box-shadow: inset 0 0 60px rgb(0 0 0 / 0.45);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.plateau.passe { border-color: var(--or); }

svg {
  width: 100%;
  height: 100%;
  cursor: pointer;
  user-select: none;
}

polygon {
  stroke: rgb(10 19 23 / 0.55);
  stroke-width: 1;
}

.case-sol { fill: #567541; }
.case-sol.damier { fill: #4e6a39; }
.case-rouge { fill: #b94e3a; }
.case-bleue { fill: #3c86c9; }
.case-obstacle { fill: #253129; stroke: #1a221d; }
.case-muret { fill: #3a4a35; }

/* États par-dessus le fond : sélecteur plus précis que « .case-sol.damier » */
.cases polygon.etat-placement { fill: #5aa6ec; stroke: var(--or-clair); stroke-width: 1.5; }
.cases polygon.etat-portee { fill: #2e5a7a; }
.cases polygon.etat-accessible { fill: #6f9a4a; }
.cases polygon.etat-chemin { fill: #a8d27a; }
.cases polygon.etat-zone { fill: #8b55c7; }

polygon:hover { filter: brightness(1.18); }

.traces { pointer-events: none; }
.traces line { stroke: var(--or-clair); stroke-width: 2.5; stroke-dasharray: 6 4; }
.fantome { fill: none; stroke: var(--or-clair); stroke-width: 2; stroke-dasharray: 3 3; }

.pions { pointer-events: none; }
.ombre { fill: rgb(0 0 0 / 0.35); }
.anneau { fill: none; stroke-width: 2.5; }
.portrait { filter: drop-shadow(0 2px 1px rgb(0 0 0 / 0.5)); }
.etiquette rect { fill: rgb(10 19 23 / 0.85); stroke: var(--bord-clair); }
.etiquette text { fill: #fff; font-size: 8.5px; font-weight: 800; text-anchor: middle; }

.pion-sadida .anneau { stroke: var(--or-clair); }
.pion-ennemi .anneau { stroke: #e0866f; }
/* Ennemi infecté : anneau et halo violets sous le portrait */
.pion-ennemi.infecte .anneau { stroke: #c9a5f0; stroke-width: 3; }
.pion-ennemi.infecte .ombre { fill: rgb(122 63 184 / 0.7); }
.pion-arbre .anneau { stroke: #a6b06a; }
.pion-arbre.feuillu .anneau { stroke: #9fd27a; stroke-width: 3; }
.pion-invocation .anneau { stroke: #c9b6f0; }

.pion.actif .anneau { stroke: var(--or); stroke-width: 4; }
.pion.menace .anneau { stroke: #e9d5ff; stroke-dasharray: 4 3; stroke-width: 3; }

.badge rect { fill: #7a3fb8; stroke: #c9a5f0; }
.badge text { fill: #fff; font-size: 9px; font-weight: 800; text-anchor: middle; }
.mandragore circle { fill: #3d2a5c; stroke: var(--mandragore); stroke-width: 1.5; }
.mandragore text { fill: var(--mandragore); font-size: 10px; font-weight: 800; text-anchor: middle; }

.legende {
  position: absolute;
  left: 16px;
  bottom: 14px;
  margin: 0;
  padding: 8px 12px;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  border-radius: 10px;
  background: rgb(10 19 23 / 0.85);
  border: 1px solid var(--bord);
  font-size: 12px;
  color: var(--texte-doux);
}
.legende li { display: flex; align-items: center; gap: 6px; }
.pastille { width: 12px; height: 12px; border-radius: 3px; }
.pastille.rouge { background: #b94e3a; }
.pastille.bleue { background: #3c86c9; }
.pastille.portee { background: #2e5a7a; }
.pastille.zone { background: #8b55c7; }
.pastille.accessible { background: #6f9a4a; }
.pastille.tient { background: #7a3fb8; border: 2px solid var(--or-clair); }
.pastille.mandragore { width: 14px; height: 14px; border-radius: 50%; background: #3d2a5c; border: 1px solid var(--mandragore); color: var(--mandragore); font-size: 9px; font-weight: 800; display: flex; align-items: center; justify-content: center; }

/* À droite du choix de salle (coin haut-gauche, 320 px) */
.message {
  position: absolute;
  top: 14px;
  left: calc(50% + 172px);
  transform: translateX(-50%);
  max-width: calc(100% - 370px);
  margin: 0;
  padding: 8px 14px;
  border-radius: 10px;
  background: #3a1d17;
  border: 1px solid #b94e3a;
  color: #ffd9cf;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}
.message.aide { background: rgb(10 19 23 / 0.85); border-color: var(--bord); color: var(--texte-doux); font-weight: 600; }
</style>
