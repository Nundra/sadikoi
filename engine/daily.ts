import type { Categorie } from './categories'
import type { MapCombat } from './plateau'
import { tirerSalle, type Salle } from './salle'

/**
 * Défi du jour : la même salle pour tous les joueurs, tirée à partir de la date (heure de
 * Paris). Aucun serveur : chaque navigateur fait le même tirage avec le même hasard.
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

/** La map du jour parmi les candidates. */
export function mapDuJour<T extends CandidatDaily>(candidats: T[], jour: string): T | undefined {
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
