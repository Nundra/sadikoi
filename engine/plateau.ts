import { NB_CASES, type Case } from './grille'

/**
 * Lettre d'une case dans data/maps.json :
 * `_` marchable, `r` / `b` placement rouge / bleu, `x` marchable mais bloque la ligne
 * de vue, `#` obstacle, `.` vide (ni marchable, ni bloquant pour la ligne de vue).
 */
export type CodeCase = '_' | 'r' | 'b' | 'x' | '#' | '.'

/** Une map de data/maps.json. */
export interface MapCombat {
  id: number
  nom: string
  zone: string
  sous_zone: string
  pos: [number, number]
  donjon?: string
  boss?: string[]
  cases: string
}

/** La map et les cases occupées (Sadida, ennemis, invocations, arbres). */
export interface Plateau {
  cases: string
  occupees: ReadonlySet<Case>
}

export function creerPlateau(cases: string, occupees: Iterable<Case> = []): Plateau {
  if (cases.length !== NB_CASES) throw new Error(`une map a ${NB_CASES} cases, pas ${cases.length}`)
  return { cases, occupees: new Set(occupees) }
}

export function code(p: Plateau, c: Case): CodeCase {
  return p.cases[c] as CodeCase
}

/** On peut s'y tenir (et donc y viser, y invoquer, y marcher si elle est libre). */
export function marchable(p: Plateau, c: Case): boolean {
  return '_rbx'.includes(p.cases[c]!)
}

export function libre(p: Plateau, c: Case): boolean {
  return marchable(p, c) && !p.occupees.has(c)
}

/** Les obstacles et toutes les entités bloquent la ligne de vue. */
export function bloqueLdv(p: Plateau, c: Case): boolean {
  return p.cases[c] === '#' || p.cases[c] === 'x' || p.occupees.has(c)
}

export function placements(p: Plateau, couleur: 'r' | 'b'): Case[] {
  const out: Case[] = []
  for (let c = 0; c < NB_CASES; c++) if (p.cases[c] === couleur) out.push(c)
  return out
}
