import { NB_CASES, depuisLosange, versLosange, type Case } from './grille'
import { creerPlateau, type CodeCase, type Plateau } from './plateau'

/** Une case au milieu de la map, loin des bords. */
export const MILIEU = 20 * 14 + 7

/** La case décalée de (di, dj) depuis `c` dans le repère losange. */
export function decale(c: Case, di: number, dj: number): Case {
  const { i, j } = versLosange(c)
  const out = depuisLosange(i + di, j + dj)
  if (out === null) throw new Error(`(${di}, ${dj}) depuis ${c} sort de la map`)
  return out
}

/** Une map toute marchable, avec quelques cases changées. */
export function plateauTest(changees: readonly (readonly [Case, CodeCase])[] = [], occupees: Case[] = []): Plateau {
  const cases = Array<CodeCase>(NB_CASES).fill('_')
  for (const [c, k] of changees) cases[c] = k
  return creerPlateau(cases.join(''), occupees)
}
