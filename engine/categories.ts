import { casesAccessibles } from './chemins'
import { NB_CASES } from './grille'
import { creerPlateau, placements, type MapCombat } from './plateau'

/** Types de map, pour choisir ce que tire le mode infini. */
export type Categorie = 'zone' | 'speciale' | 'donjon' | 'koli' | 'songes' | 'autre'

export const CATEGORIES: { id: Categorie, nom: string, description: string }[] = [
  { id: 'zone', nom: 'Zones', description: 'Les maps normales du monde : 10 ou 12 cases de placement par équipe, sur la carte du monde.' },
  { id: 'speciale', nom: 'Zones spéciales', description: 'Les autres maps de zone : autre nombre de cases (1, 4, 8…) ou hors de la carte du monde (instances, scénarios).' },
  { id: 'donjon', nom: 'Donjons', description: 'Toutes les salles de donjon, boss et Expéditions compris.' },
  { id: 'koli', nom: 'Kolizéum et arènes', description: 'Kolizéum (entraînement, duel, équipes) et Arènes de Goultard.' },
  { id: 'songes', nom: 'Songes', description: 'Songes Infinis et Contrées oniriques.' },
  { id: 'autre', nom: 'Autres', description: 'Mode tactique, Foire du Trool, zones privées, mini-jeux où les équipes ne se rejoignent pas.' },
]

// Zones à part : cartes génériques, événements, tests
const ZONES_AUTRES = new Set(['', 'Mode tactique', 'Zone privée', 'Convention', 'Foire du Trool'])

/** Nombre de cases de placement par équipe d'une map normale. */
export const PLACES_NORMALES = [10, 12]

/** Map normale du monde : 10 ou 12 cases de placement par équipe et une vraie position (les instances sont en [0, 0]). */
function normale(m: MapCombat): boolean {
  const p = creerPlateau(m.cases)
  const rouges = placements(p, 'r').length
  return PLACES_NORMALES.includes(rouges) && placements(p, 'b').length === rouges && (m.pos[0] !== 0 || m.pos[1] !== 0)
}

/** Les deux équipes peuvent-elles se rejoindre ? Sinon c'est un mini-jeu (îlots, lancer de couteaux…). */
function connexe(m: MapCombat): boolean {
  const p = creerPlateau(m.cases)
  const rouges = placements(p, 'r')
  const acc = casesAccessibles(p, rouges[0]!, NB_CASES)
  return [...rouges, ...placements(p, 'b')].every(c => acc.has(c))
}

export function categorie(m: MapCombat): Categorie {
  if (m.sous_zone.startsWith('Kolizéum') || m.zone === 'Arènes de Goultard') return 'koli'
  if (m.donjon) return 'donjon'
  if (m.zone === 'Rêve du Monde des Douze') return 'songes'
  if (ZONES_AUTRES.has(m.zone) || !connexe(m)) return 'autre'
  return normale(m) ? 'zone' : 'speciale'
}
