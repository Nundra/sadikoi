import type { Categorie } from './categories'
import { NB_CASES, type Case } from './grille'
import { nouvellePartie, rejouer, score, termine, type Action } from './partie'
import type { MapCombat } from './plateau'
import { casesDuJoueur, tirerSalle, type Salle } from './salle'

/**
 * Défi du jour : la même salle pour tous les joueurs, tirée à partir de la date (heure de
 * Paris). Chaque navigateur fait le même tirage avec le même hasard ; le serveur du classement
 * (functions/api/daily.ts) aussi, pour rejouer les tours envoyés.
 */

/** Types de map tirés pour le défi. */
export const CATEGORIES_DAILY: Categorie[] = ['zone', 'songes']
/** Nombre d'ennemis du défi (une map en a au moins autant en cases de placement). */
export const ENNEMIS_DAILY: [number, number] = [6, 8]
/**
 * Étoiles pour valider le défi : il compte comme fait (plus d'invitation ce jour-là) et le tour
 * peut entrer au classement.
 */
export const ETOILES_DAILY = 1

/** Ce qu'il faut savoir d'une map pour la tirer : son type et ses cases de placement ennemies. */
export interface CandidatDaily {
  id: number
  categorie: Categorie
  places: number
}

/** Le jour du défi, AAAA-MM-JJ, à l'heure de Paris : il change à minuit pour tout le monde. */
export function jourDe(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

/** Un hasard reproductible, tiré d'un texte (FNV-1a puis mulberry32). */
export function aleaDe(graine: string): () => number {
  let h = 2166136261
  for (let k = 0; k < graine.length; k++) h = Math.imul(h ^ graine.charCodeAt(k), 16777619)
  let a = h >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Les maps qui peuvent sortir : zones et Songes avec assez de cases ennemies, hors exclues. */
export function candidatsDaily<T extends CandidatDaily>(maps: T[], exclues: ReadonlySet<number> = new Set()): T[] {
  return maps
    .filter(m => CATEGORIES_DAILY.includes(m.categorie) && m.places >= ENNEMIS_DAILY[0] && !exclues.has(m.id))
    .sort((a, b) => a.id - b.id)
}

/** La map du jour parmi les candidates (déjà filtrées et triées par id). */
export function mapDuJour<T extends { id: number }>(candidats: T[], jour: string): T | undefined {
  const alea = aleaDe(`map:${jour}`)
  return candidats[Math.floor(alea() * candidats.length)]
}

/** Les ennemis du jour sur cette map (6 à 8), et le hasard des monstres dessinés. */
export function salleDuJour(map: MapCombat, jour: string): Salle & { alea: () => number } {
  const alea = aleaDe(`salle:${jour}`)
  const [min, max] = ENNEMIS_DAILY
  const nombre = min + Math.floor(alea() * (max - min + 1))
  return { ...tirerSalle(map, { nombre, alea }), alea }
}

/** Ce que le navigateur envoie : le tour joué sur la salle du jour, pas son score. */
export interface TourEnvoye {
  jour: string
  /** Identifiant tiré au hasard par le navigateur : un même score ne compte qu'une fois par joueur. */
  joueur: string
  sadida: Case
  sorts: number[]
  prycipithon: boolean
  actions: Action[]
}

/** Taille maximale d'un tour envoyé, en caractères de JSON (un vrai tour en fait 2 à 5 000). */
export const TAILLE_MAX_TOUR = 20_000
/** Nombre maximal d'actions dans un tour envoyé. */
export const ACTIONS_MAX = 200
/** Nombre maximal de sorts choisis (22 paires dans la barre). */
const SORTS_MAX = 22

const entier = (x: unknown, min: number, max: number): x is number => Number.isInteger(x) && (x as number) >= min && (x as number) <= max
const estCase = (x: unknown): x is Case => entier(x, 0, NB_CASES - 1)
const estId = (x: unknown): x is number => entier(x, 0, 1_000_000)

/** Une action reçue du réseau, recopiée champ par champ (rien d'autre n'est gardé), ou null. */
function nettoyerAction(x: unknown): Action | null {
  if (typeof x !== 'object' || x === null) return null
  const a = x as Record<string, unknown>
  if (!estId(a.acteur)) return null
  if (a.type === 'deplacement' && estCase(a.vers)) return { type: 'deplacement', acteur: a.acteur, vers: a.vers }
  if (a.type === 'sort' && estId(a.sort) && estCase(a.cible)) return { type: 'sort', acteur: a.acteur, sort: a.sort, cible: a.cible }
  if (a.type === 'fin') return { type: 'fin', acteur: a.acteur }
  return null
}

/**
 * Le tour reçu par l'API du classement, vérifié et recopié champ par champ : ce qui arrive du
 * réseau peut être n'importe quoi, et seul ce qui sert à rejouer le tour est gardé en base
 * (pas de champ en plus, pas de texte géant). null s'il est mal formé.
 */
export function nettoyerTour(brut: unknown): TourEnvoye | null {
  if (typeof brut !== 'object' || brut === null) return null
  const t = brut as Record<string, unknown>
  if (typeof t.jour !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t.jour)) return null
  if (typeof t.joueur !== 'string' || !/^[0-9a-f-]{36}$/.test(t.joueur)) return null
  if (!estCase(t.sadida)) return null
  if (!Array.isArray(t.sorts) || t.sorts.length > SORTS_MAX || !t.sorts.every(estId)) return null
  if (!Array.isArray(t.actions) || t.actions.length > ACTIONS_MAX) return null
  const actions = t.actions.map(nettoyerAction)
  if (actions.some(a => a === null)) return null
  return { jour: t.jour, joueur: t.joueur, sadida: t.sadida, sorts: [...t.sorts], prycipithon: t.prycipithon === true, actions: actions as Action[] }
}

/** Une ligne du classement : un score, et combien de joueurs l'ont pour meilleur score du jour. */
export interface LigneClassement {
  points: number
  etoiles: number
  joueurs: number
}

/** Le classement du jour : les scores validés (ETOILES_DAILY étoiles au moins), du meilleur au moins bon. */
export interface ClassementDaily {
  lignes: LigneClassement[]
  /** Joueurs qui n'ont pas encore validé le défi (aucun tour à ETOILES_DAILY étoiles). */
  sousLeSeuil: number
}

/**
 * Rejoue un tour envoyé sur la salle du jour, aux caractéristiques par défaut, et donne son
 * score ; null si le tour n'est pas valable (placement, sorts, action impossible, tour pas fini).
 */
export function rejouerDefi(salle: Salle, tour: TourEnvoye): { points: number, etoiles: number, paDepenses: number, prycipithon: boolean } | null {
  if (!casesDuJoueur(salle.map).includes(tour.sadida)) return null
  // Ce qui arrive du réseau peut être n'importe quoi : un tour mal formé est simplement refusé
  try {
    const depart = nouvellePartie({ cases: salle.map.cases, sadida: tour.sadida, ennemis: salle.ennemis, sorts: tour.sorts, prycipithon: tour.prycipithon === true })
    const r = rejouer(depart, tour.actions)
    if (r.erreur || !termine(r.partie)) return null
    const s = score(r.partie)
    return { points: s.points, etoiles: s.etoiles, paDepenses: s.paDepenses, prycipithon: tour.prycipithon === true }
  } catch {
    return null
  }
}
