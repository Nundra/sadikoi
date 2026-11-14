import { depuisLosange, versLosange, type Case } from './grille'
import { bloqueLdv, type Plateau } from './plateau'

/**
 * Les cases entre a et b (a et b exclues) que la ligne de vue doit traverser.
 *
 * Reprise à l'identique de l'algorithme du client Dofus 2 (`MapTools._createCellsListForCells`,
 * appelé par `Dofus2Line.getLine`), dans le repère losange où les cases sont des carrés :
 *   - diagonale exacte (|Δi| = |Δj|) : seulement les cases de la diagonale ;
 *   - sinon on avance case par case sur l'axe le plus long. Pour chaque colonne traversée,
 *     on regarde la coordonnée de l'autre axe à l'entrée et à la sortie de la colonne
 *     (arrondie à 4 décimales, comme le jeu) : si la ligne franchit vraiment un bord, les
 *     deux cases comptent ; si elle ne fait que toucher un bord (passage exact par un coin),
 *     seule la case réellement traversée compte. Les deux cases qui se touchent au coin ne
 *     bloquent donc pas la ligne de vue.
 */
export function casesSurLaLigne(a: Case, b: Case): Case[] {
  if (a === b) return []
  const p = versLosange(a)
  const q = versLosange(b)
  const out: Case[] = []
  const ajouter = (i: number, j: number) => {
    if (i === q.i && j === q.j) return
    const c = depuisLosange(i, j)
    if (c !== null) out.push(c)
  }
  // Position courante et arrivée, au centre des cases
  const pos = [p.i + 0.5, p.j + 0.5]
  const d = [q.i - p.i, q.j - p.j]

  if (Math.abs(d[0]!) === Math.abs(d[1]!)) {
    const pas = [Math.sign(d[0]!), Math.sign(d[1]!)]
    for (let k = 0; k < Math.abs(d[0]!); k++) {
      ajouter(Math.floor(pos[0]! + pas[0]!), Math.floor(pos[1]! + pas[1]!))
      pos[0]! += pas[0]!
      pos[1]! += pas[1]!
    }
    return out
  }

  // Axe principal (le plus long) et axe secondaire
  const M = Math.abs(d[0]!) > Math.abs(d[1]!) ? 0 : 1
  const m = 1 - M
  const etapes = Math.abs(d[M]!)
  const pas = [0, 0]
  pas[M] = d[M]! >= 0 ? 1 : -1
  pas[m] = d[m]! / etapes
  for (let k = 0; k < etapes; k++) {
    // Coordonnée secondaire à l'entrée et à la sortie de la colonne suivante
    const entree = Math.round(pos[m]! * 10000 + pas[m]! * 5000) / 10000
    const sortie = Math.round(pos[m]! * 10000 + pas[m]! * 15000) / 10000
    const centre = pos[m]! + pas[m]!
    let secondaires: number[]
    if (Math.floor(entree) === Math.floor(sortie)) {
      secondaires = [Math.floor(centre)]
    } else if (Math.ceil(entree) === Math.ceil(sortie)) {
      // La ligne touche un bord sans le franchir : seule la case traversée compte
      let v = Math.ceil(centre)
      if ((entree === v && sortie < v) || (sortie === v && entree < v)) v = Math.floor(centre)
      secondaires = [v]
    } else {
      secondaires = [Math.floor(entree), Math.floor(sortie)]
    }
    const principal = Math.floor(pos[M]! + pas[M]!)
    for (const v of secondaires) {
      if (M === 0) ajouter(principal, v)
      else ajouter(v, principal)
    }
    pos[0]! += pas[0]!
    pos[1]! += pas[1]!
  }
  return out
}

export function ligneDeVue(p: Plateau, a: Case, b: Case): boolean {
  return casesSurLaLigne(a, b).every(c => !bloqueLdv(p, c))
}
