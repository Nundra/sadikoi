import { voisines, type Case } from './grille'
import { libre, type Plateau } from './plateau'

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
