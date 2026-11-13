import { NB_CASES, versLosange, type Case } from './grille'

/** Formes de zone de data/sorts.json (zone.forme) utiles à l'infection. */
export type FormeZone = 'point' | 'cercle' | 'carre' | 'croix' | 'croix_diag'

/** Les cases d'une zone centrée sur `centre`. La taille est le rayon. */
export function zone(centre: Case, forme: FormeZone, taille: number): Case[] {
  const p = versLosange(centre)
  const out: Case[] = []
  for (let c = 0; c < NB_CASES; c++) {
    const q = versLosange(c)
    const di = Math.abs(p.i - q.i)
    const dj = Math.abs(p.j - q.j)
    const dedans = forme === 'point' ? di + dj === 0
      : forme === 'cercle' ? di + dj <= taille
      : forme === 'carre' ? Math.max(di, dj) <= taille
      : forme === 'croix_diag' ? di === dj && di <= taille
      : (di === 0 || dj === 0) && di + dj <= taille
    if (dedans) out.push(c)
  }
  return out
}
