/**
 * Grille d'une map : 14 colonnes × 40 rangées en quinconce, cases numérotées de 0 à 559
 * rangée par rangée. Les rangées impaires sont décalées d'une demi-case vers la droite.
 *
 * Pour les calculs, on passe en coordonnées « losange » (i, j) : dans ce repère, les
 * cases forment un quadrillage carré ordinaire, où deux cases voisines diffèrent de 1
 * sur i ou sur j.
 *   - « en ligne » (lancer en ligne, déplacement) : même i ou même j ;
 *   - « en diagonale » : |Δi| = |Δj| (horizontale ou verticale à l'écran).
 */

export const COLONNES = 14
export const RANGEES = 40
export const NB_CASES = COLONNES * RANGEES

/** Numéro de case, de 0 à 559. */
export type Case = number

export interface Losange {
  i: number
  j: number
}

export function versLosange(c: Case): Losange {
  const r = Math.floor(c / COLONNES)
  const x = 2 * (c % COLONNES) + (r % 2) + 1
  const y = r + 1
  return { i: (x + y) / 2, j: (x - y) / 2 }
}

/** Case aux coordonnées (i, j), ou null si elle tombe hors de la map. */
export function depuisLosange(i: number, j: number): Case | null {
  const x = i + j
  const r = i - j - 1
  if (r < 0 || r >= RANGEES) return null
  const col = (x - 1 - (r % 2)) / 2
  if (!Number.isInteger(col) || col < 0 || col >= COLONNES) return null
  return r * COLONNES + col
}

export function distance(a: Case, b: Case): number {
  const p = versLosange(a)
  const q = versLosange(b)
  return Math.abs(p.i - q.i) + Math.abs(p.j - q.j)
}

/** Les cases voisines (jusqu'à 4), celles où l'on peut aller en 1 PM. */
export function voisines(c: Case): Case[] {
  const { i, j } = versLosange(c)
  return [depuisLosange(i + 1, j), depuisLosange(i - 1, j), depuisLosange(i, j + 1), depuisLosange(i, j - 1)]
    .filter((v): v is Case => v !== null)
}

export function enLigne(a: Case, b: Case): boolean {
  const p = versLosange(a)
  const q = versLosange(b)
  return p.i === q.i || p.j === q.j
}

export function enDiagonale(a: Case, b: Case): boolean {
  const p = versLosange(a)
  const q = versLosange(b)
  return Math.abs(p.i - q.i) === Math.abs(p.j - q.j)
}
