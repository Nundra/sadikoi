import { voisines, type Case } from './grille'
import { libre, type Plateau } from './plateau'
import { perte } from './tacle'

/**
 * Cases atteignables depuis `depart` avec `pm` PM, et leur coût en PM (0 pour le départ).
 * On marche de case libre en case libre ; les entités ne se traversent pas.
 * `arret` : cases d'où l'on ne peut plus repartir (tacle : au contact d'un ennemi). On peut y
 * entrer, pas en ressortir ; si le départ en est une, on ne bouge pas.
 */
export function casesAccessibles(p: Plateau, depart: Case, pm: number, arret: (c: Case) => boolean = () => false): Map<Case, number> {
  const couts = new Map<Case, number>([[depart, 0]])
  let front = [depart]
  for (let n = 1; n <= pm && front.length; n++) {
    const suivant: Case[] = []
    for (const c of front) {
      if (arret(c)) continue
      for (const v of voisines(c)) {
        if (couts.has(v) || !libre(p, v)) continue
        couts.set(v, n)
        suivant.push(v)
      }
    }
    front = suivant
  }
  return couts
}

/** Le plus court chemin (sans la case de départ), ou null si `arrivee` est hors d'atteinte. */
export function chemin(p: Plateau, depart: Case, arrivee: Case, pm = Infinity, arret: (c: Case) => boolean = () => false): Case[] | null {
  const precedente = new Map<Case, Case>()
  let front = [depart]
  const vues = new Set([depart])
  for (let n = 1; n <= pm && front.length; n++) {
    const suivant: Case[] = []
    for (const c of front) {
      if (arret(c)) continue
      for (const v of voisines(c)) {
        if (vues.has(v) || !libre(p, v)) continue
        vues.add(v)
        precedente.set(v, c)
        if (v === arrivee) {
          const out = [v]
          for (let k = c; k !== depart; k = precedente.get(k)!) out.unshift(k)
          return out
        }
        suivant.push(v)
      }
    }
    front = suivant
  }
  return null
}

/** Où l'on arrive par le meilleur chemin : PM et PA restants, et la case d'avant. */
export interface Arrivee {
  pm: number
  pa: number
  precedente?: Case
}

/**
 * Cases atteignables depuis `depart` avec `pm` PM et `pa` PA, quand quitter une case fait perdre
 * des PM et des PA (le tacle) : `garde(c)` est la part gardée en quittant `c` (1 : rien perdu).
 * Pour chaque case, le chemin qui y laisse le plus de PM, puis le plus de PA.
 */
export function deplacements(p: Plateau, depart: Case, pm: number, pa: number, garde: (c: Case) => number = () => 1): Map<Case, Arrivee> {
  const arrivees = new Map<Case, Arrivee>([[depart, { pm, pa }]])
  let front = [depart]
  while (front.length) {
    const suivant = new Set<Case>()
    for (const c of front) {
      const a = arrivees.get(c)!
      const g = garde(c)
      const restePm = a.pm - perte(a.pm, g)
      const restePa = a.pa - perte(a.pa, g)
      if (restePm < 1) continue
      for (const v of voisines(c)) {
        if (v === depart || !libre(p, v)) continue
        const avant = arrivees.get(v)
        if (avant && (avant.pm > restePm - 1 || (avant.pm === restePm - 1 && avant.pa >= restePa))) continue
        arrivees.set(v, { pm: restePm - 1, pa: restePa, precedente: c })
        suivant.add(v)
      }
    }
    front = [...suivant]
  }
  return arrivees
}

/** Le chemin vers `arrivee` (sans la case de départ) d'après `deplacements`, ou null. */
export function cheminVers(arrivees: Map<Case, Arrivee>, arrivee: Case): Case[] | null {
  const out: Case[] = []
  for (let c: Case | undefined = arrivee; c !== undefined && arrivees.get(c)?.precedente !== undefined; c = arrivees.get(c)!.precedente) out.unshift(c)
  return out.length ? out : null
}
