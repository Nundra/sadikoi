import type { Case } from './grille'
import { aleaDe } from './hasard'
import donnees from '../data/tacle.json'

/**
 * Tacle, comme le client du jeu (`TackleUtil` de Dofus 2) : en quittant une case au contact
 * d'ennemis, on garde la part (Fuite + 2) / (2 × (Tacle + 2)) de ses PM et de ses PA, une fois
 * par ennemi au contact (les parts se multiplient), au plus 100 %. Un Intaclable ne perd rien.
 * Les données (data/tacle.json) viennent de scripts/extract-tacle.py.
 */

const MONSTRES = donnees.monstres as Record<string, number[]>
const SOUS_ZONES = donnees.sousZones as Record<string, number[]>
const MAPS = donnees.maps as Record<string, number>
const INVOCATIONS = donnees.invocations as Record<string, number>
/** Sous-zones qui ont des monstres, pour les maps qui n'en ont pas (Songes, maps perso). */
const AVEC_MONSTRES = Object.keys(SOUS_ZONES).sort((a, b) => Number(a) - Number(b))

/** Part des PM et des PA gardée en quittant le contact de ces tacleurs (1 : rien n'est perdu). */
export function partGardee(fuite: number, tacles: number[]): number {
  return tacles.reduce((part, tacle) => part * Math.min(1, (fuite + 2) / (2 * (tacle + 2))), 1)
}

/** PM ou PA perdus sur `restant`, quand on n'en garde que la part `garde`. */
export function perte(restant: number, garde: number): number {
  return garde >= 1 ? 0 : Math.round(restant * (1 - garde))
}

/** Fuite d'une invocation du Sadida (données du jeu, dernier grade). */
export function fuiteInvocation(monstre: number): number {
  return INVOCATIONS[monstre] ?? 0
}

/**
 * Tacle de chaque ennemi d'une salle, tiré au hasard mais toujours le même pour la même salle :
 * des monstres de la sous-zone de la map (ou d'une sous-zone tirée au hasard si la map n'en a
 * pas), chacun à un grade au hasard. Les ennemis gardent leur visuel : seul le Tacle en vient.
 * `cle` distingue les maps (id de la map, ou ses cases pour une map perso).
 */
export function taclesDesEnnemis(mapId: number, cle: string, ennemis: Case[]): number[] {
  const alea = aleaDe(`tacle:${cle}:${ennemis.join(',')}`)
  const auHasard = <T>(liste: T[]): T => liste[Math.floor(alea() * liste.length)]!
  const sz = MAPS[mapId]
  const monstres = (sz !== undefined && SOUS_ZONES[sz]) || SOUS_ZONES[auHasard(AVEC_MONSTRES)]!
  return ennemis.map(() => auHasard(MONSTRES[auHasard(monstres)]!))
}
