import type { Case } from './grille'
import { creerPlateau, placements, type MapCombat } from './plateau'
import { taclesDesEnnemis } from './tacle'

/**
 * Couleurs de placement en PvM, constatées en jeu sur toutes les maps : le joueur part des
 * cases rouges des données, les ennemis des bleues. (À l'écran, les cases du joueur sont
 * toujours dessinées en bleu.)
 */
export const EQUIPE_JOUEUR = 'r'
export const EQUIPE_ENNEMIE = 'b'

/** Les couleurs de placement du joueur et des ennemis sur cette map (les mêmes partout, pour l'instant). */
export function equipes(_map: MapCombat): { joueur: 'r' | 'b', ennemie: 'r' | 'b' } {
  return { joueur: EQUIPE_JOUEUR, ennemie: EQUIPE_ENNEMIE }
}

/** Une salle : une map et les ennemis placés sur leurs cases de départ. */
export interface Salle {
  map: MapCombat
  ennemis: Case[]
}

/**
 * Tire une salle sur une map : `nombre` ennemis (par défaut de 3 à 8) sur des cases
 * de placement ennemies prises au hasard.
 */
export function tirerSalle(map: MapCombat, o: { nombre?: number, alea?: () => number } = {}): Salle {
  const alea = o.alea ?? Math.random
  const cases = placements(creerPlateau(map.cases), equipes(map).ennemie)
  const voulu = o.nombre ?? 3 + Math.floor(alea() * 6)
  // Mélange de Fisher-Yates
  for (let k = cases.length - 1; k > 0; k--) {
    const l = Math.floor(alea() * (k + 1))
    ;[cases[k], cases[l]] = [cases[l]!, cases[k]!]
  }
  return { map, ennemis: cases.slice(0, Math.min(voulu, cases.length)).sort((a, b) => a - b) }
}

/** Le Tacle de chaque ennemi de la salle : toujours le même pour la même salle (voir tacle.ts). */
export function taclesDeSalle(salle: Salle): number[] {
  // Une map perso (id 0) se reconnaît à ses cases
  return taclesDesEnnemis(salle.map.id, salle.map.id ? String(salle.map.id) : salle.map.cases, salle.ennemis)
}

/** Les cases où le joueur peut placer son Sadida. */
export function casesDuJoueur(map: MapCombat): Case[] {
  return placements(creerPlateau(map.cases), equipes(map).joueur)
}

/**
 * Code court d'une salle, pour la partager (dans l'URL) : la map en base 36, un tiret, puis
 * 3 caractères par ennemi (2 pour la case, 1 pour le monstre dessiné, en base 36).
 * Exemple : « 1zf3k-0a40bk1 ».
 */
export function codeSalle(map: MapCombat, ennemis: Case[], portraits: number[] = []): string {
  const parEnnemi = ennemis.map((c, k) => c.toString(36).padStart(2, '0') + ((portraits[k] ?? 0) % 36).toString(36))
  return `${map.id.toString(36)}-${parEnnemi.join('')}`
}

/** Relit un code de salle ; null s'il ne correspond à rien de jouable. */
export function lireCodeSalle(code: string, maps: MapCombat[]): { map: MapCombat, ennemis: Case[], portraits: number[] } | null {
  const m = /^([0-9a-z]+)-((?:[0-9a-z]{3})+)$/.exec(code.trim().toLowerCase())
  if (!m) return null
  const map = maps.find(x => x.id === parseInt(m[1]!, 36))
  if (!map) return null
  const morceaux = m[2]!.match(/.{3}/g)!
  const ennemis = morceaux.map(x => parseInt(x.slice(0, 2), 36))
  const portraits = morceaux.map(x => parseInt(x[2]!, 36))
  // Les ennemis doivent être sur des cases de placement ennemies, toutes différentes
  const valides = new Set(placements(creerPlateau(map.cases), equipes(map).ennemie))
  if (new Set(ennemis).size !== ennemis.length || !ennemis.every(c => valides.has(c))) return null
  return { map, ennemis, portraits }
}
