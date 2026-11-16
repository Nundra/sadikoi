import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { addVitePlugin, defineNuxtModule } from 'nuxt/kit'
import { categorie } from '../engine/categories'
import { candidatsDaily } from '../engine/daily'
import { creerPlateau, placements, type MapCombat } from '../engine/plateau'
import { equipes } from '../engine/salle'

/**
 * Découpe data/maps.json au build, pour ne pas tout charger à l'arrivée (2,6 Mo, plus le calcul
 * du type de chaque map) :
 * - `virtual:maps` : l'index (tout sauf les cases, avec le type de la map et son nombre de cases
 *   de placement ennemies déjà calculés, pour le défi du jour), et
 *   `chargerCases(id)` qui charge le paquet de cases de la map ;
 * - PAQUETS paquets de cases (la map n° k de la liste va dans le paquet k modulo PAQUETS : les
 *   id, eux, se répartissent mal), chargés à la demande (import dynamique).
 * - pour le classement du défi du jour (functions/api/daily.ts), dans le site publié :
 *   `_daily/candidats.json` (id des maps qui peuvent sortir, triés) et `_daily/cases/<id>.txt`
 *   (cases de chacune) : le serveur ne lit que la map du jour, sans charger les 2,6 Mo.
 * data/maps.json reste la source (scripts, tests du moteur).
 */
const PAQUETS = 32
const SOURCE = new URL('../data/maps.json', import.meta.url)
const ID = 'virtual:maps'
const PAQUET = 'virtual:maps/paquet/'

export default defineNuxtModule({
  meta: { name: 'maps' },
  setup(_options, nuxt) {
    let maps: MapCombat[] | null = null
    const lire = () => (maps ??= (JSON.parse(readFileSync(SOURCE, 'utf-8')) as { maps: MapCombat[] }).maps)

    nuxt.hook('nitro:build:public-assets', (nitro) => {
      const reglages = JSON.parse(readFileSync(new URL('../data/daily.json', import.meta.url), 'utf-8')) as { exclues: number[] }
      const index = lire().map(m => ({ id: m.id, categorie: categorie(m), places: placements(creerPlateau(m.cases), equipes(m).ennemie).length }))
      const candidats = candidatsDaily(index, new Set(reglages.exclues)).map(m => m.id)
      const dossier = join(nitro.options.output.publicDir, '_daily')
      mkdirSync(join(dossier, 'cases'), { recursive: true })
      writeFileSync(join(dossier, 'candidats.json'), JSON.stringify(candidats))
      const parId = new Map(lire().map(m => [m.id, m.cases]))
      for (const id of candidats) writeFileSync(join(dossier, 'cases', `${id}.txt`), parId.get(id)!)
    })

    addVitePlugin({
      name: 'sadikoi-maps',
      resolveId(id) {
        if (id === ID || id.startsWith(PAQUET)) return `\0${id}`
      },
      load(id) {
        if (id === `\0${ID}`) {
          const index = lire().map((m, k) => {
            const { cases: _cases, ...sansCases } = m
            const places = placements(creerPlateau(m.cases), equipes(m).ennemie).length
            return { ...sansCases, categorie: categorie(m), places, paquet: k % PAQUETS }
          })
          const chargeurs = Array.from({ length: PAQUETS }, (_, k) => `() => import('${PAQUET}${k}')`).join(',\n  ')
          return `export const index = JSON.parse(${JSON.stringify(JSON.stringify(index))})
const chargeurs = [
  ${chargeurs},
]
const paquets = new Map()
export async function chargerCases(m) {
  if (!paquets.has(m.paquet)) paquets.set(m.paquet, chargeurs[m.paquet]().then(x => x.default))
  return (await paquets.get(m.paquet))[m.id]
}`
        }
        if (id.startsWith(`\0${PAQUET}`)) {
          const k = Number(id.slice(PAQUET.length + 1))
          const cases = Object.fromEntries(lire().filter((_, i) => i % PAQUETS === k).map(m => [m.id, m.cases]))
          return `export default JSON.parse(${JSON.stringify(JSON.stringify(cases))})`
        }
      },
    })
  },
})
