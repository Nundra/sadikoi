import { NB_CASES, type Case } from './grille'
import { creerPlateau, placements, type CodeCase, type MapCombat } from './plateau'
import { EQUIPE_ENNEMIE, EQUIPE_JOUEUR } from './salle'

/**
 * Créateur de map. Une map perso est une chaîne de 560 lettres, comme `cases` dans
 * data/maps.json : `_` case libre, `.` vide (ni marchable, ni bloquant pour la ligne de vue),
 * `#` obstacle (ni marchable, bloque la ligne de vue), `x` marchable qui bloque la ligne de vue
 * (gardé quand on part d'une map du jeu), `r` case de départ du joueur, `b` ennemi (un ennemi
 * par case `b`).
 */

export type Outil = 'sol' | 'vide' | 'obstacle' | 'depart' | 'ennemi'

export const OUTILS: Outil[] = ['sol', 'vide', 'obstacle', 'depart', 'ennemi']

export const LETTRE_OUTIL: Record<Outil, CodeCase> = {
  sol: '_', vide: '.', obstacle: '#', depart: EQUIPE_JOUEUR, ennemi: EQUIPE_ENNEMIE,
}

export const MAX_ENNEMIS = 16

/** Une map toute en cases libres, pour partir de zéro. */
export function carteVide(): string {
  return '_'.repeat(NB_CASES)
}

/**
 * Une map perso tirée d'une salle du jeu : ses cases, avec ses ennemis à leur place.
 * Les autres cases de placement ennemies deviennent des cases libres.
 */
export function carteDepuisSalle(map: MapCombat, ennemis: Case[]): string {
  const ici = new Set(ennemis)
  return [...map.cases].map((l, c) => (l === EQUIPE_ENNEMIE && !ici.has(c) ? '_' : l)).join('')
}

/** Peint une case avec un outil ; renvoie la même chaîne si rien ne change. */
export function peindre(cases: string, c: Case, outil: Outil): string {
  const l = LETTRE_OUTIL[outil]
  if (c < 0 || c >= NB_CASES || cases[c] === l) return cases
  return cases.slice(0, c) + l + cases.slice(c + 1)
}

export function ennemisDe(cases: string): Case[] {
  return placements(creerPlateau(cases), EQUIPE_ENNEMIE)
}

export function departsDe(cases: string): Case[] {
  return placements(creerPlateau(cases), EQUIPE_JOUEUR)
}

export type ProblemeCarte = 'sans-depart' | 'sans-ennemi' | 'trop-d-ennemis'

/** Ce qui empêche de jouer la map (vide si elle est jouable). */
export function problemesCarte(cases: string): ProblemeCarte[] {
  const out: ProblemeCarte[] = []
  if (!departsDe(cases).length) out.push('sans-depart')
  const n = ennemisDe(cases).length
  if (!n) out.push('sans-ennemi')
  if (n > MAX_ENNEMIS) out.push('trop-d-ennemis')
  return out
}

/** La map perso sous la forme d'une map du jeu, pour la jouer. Id 0 : aucune map du jeu ne l'a. */
export function mapPerso(cases: string): MapCombat {
  return { id: 0, nom: '', zone: '', sous_zone: '', pos: [0, 0], cases }
}

// Code de partage : « 1 » (version), puis la map en plages de cases identiques. Une plage est la
// lettre du type de case en majuscule, suivie de sa longueur en base 36 si elle dépasse 1.
// Exemple : « 1S14DS77ES77 » = 40 cases libres, un départ, 259 cases libres, un ennemi, 259 cases libres.
const LETTRE_CODE: Record<string, string> = { '_': 'S', '.': 'V', '#': 'O', 'x': 'M', 'r': 'D', 'b': 'E' }
const CASE_CODE = Object.fromEntries(Object.entries(LETTRE_CODE).map(([k, v]) => [v, k]))

export function codeCarte(cases: string): string {
  let out = '1'
  for (let c = 0; c < cases.length;) {
    let n = 1
    while (c + n < cases.length && cases[c + n] === cases[c]) n++
    out += LETTRE_CODE[cases[c]!] + (n > 1 ? n.toString(36) : '')
    c += n
  }
  return out
}

/** Relit un code de map perso ; null s'il est abîmé ou ne fait pas 560 cases. */
export function lireCodeCarte(code: string): string | null {
  const m = /^1((?:[SVOMDE][0-9a-z]*)+)$/.exec(code.trim())
  if (!m) return null
  let cases = ''
  for (const [, l, n] of m[1]!.matchAll(/([SVOMDE])([0-9a-z]*)/g)) {
    const fois = n ? parseInt(n, 36) : 1
    if (!fois || cases.length + fois > NB_CASES) return null
    cases += CASE_CODE[l!]!.repeat(fois)
  }
  return cases.length === NB_CASES ? cases : null
}
