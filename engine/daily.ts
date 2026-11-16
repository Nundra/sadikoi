import type { Categorie } from './categories'
import type { Case } from './grille'
import { nouvellePartie, rejouer, score, termine, VERSION_REGLES, type Action } from './partie'
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
/** Étoiles pour que le défi compte comme fait (plus d'invitation ce jour-là). */
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

/** Taille du classement gardé pour chaque jour. */
export const TAILLE_CLASSEMENT = 5

/** Clé du classement d'un jour : une nouvelle version des règles repart d'un classement vide. */
export const cleClassement = (jour: string) => `daily:${jour}:v${VERSION_REGLES}`

/** Ce que le navigateur envoie : le tour joué sur la salle du jour, pas son score. */
export interface TourEnvoye {
  jour: string
  sadida: Case
  sorts: number[]
  prycipithon: boolean
  actions: Action[]
}

/** Une ligne du classement. Les actions restent pour pouvoir revoir le tour plus tard. */
export interface EntreeClassement {
  id: string
  points: number
  etoiles: number
  paDepenses: number
  prycipithon: boolean
  /** Moment de l'envoi (ms), pour départager : à points égaux, le premier garde la place. */
  date: number
  tour?: Omit<TourEnvoye, 'jour'>
}

/**
 * Rejoue un tour envoyé sur la salle du jour, aux caractéristiques par défaut, et donne son
 * score ; null si le tour n'est pas valable (placement, sorts, action impossible, tour pas fini).
 */
export function rejouerDefi(salle: Salle, tour: TourEnvoye): Omit<EntreeClassement, 'id' | 'date' | 'tour'> | null {
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

/**
 * Ajoute une entrée au classement : une seule ligne par valeur de points (un même score obtenu
 * autrement ne fait pas de nouvelle ligne, la plus ancienne reste), du meilleur au moins bon,
 * TAILLE_CLASSEMENT lignes au plus. Null si rien ne change.
 */
export function insererClassement(top: EntreeClassement[], entree: EntreeClassement): EntreeClassement[] | null {
  if (entree.points <= 0 || top.some(e => e.points === entree.points)) return null
  const suite = [...top, entree].sort((a, b) => b.points - a.points || a.date - b.date).slice(0, TAILLE_CLASSEMENT)
  return suite.includes(entree) ? suite : null
}
