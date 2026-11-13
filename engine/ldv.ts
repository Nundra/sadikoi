import { depuisLosange, versLosange, type Case } from './grille'
import { bloqueLdv, type Plateau } from './plateau'

/**
 * Les cases entre a et b (a et b exclues) que la ligne de vue doit traverser.
 *
 * On trace le segment entre les centres des deux cases dans le repère losange, où les
 * cases sont des carrés, et on relève chaque case qu'il traverse. Deux cas particuliers,
 * repris du jeu tel qu'on le comprend (à vérifier en jeu) :
 *   - diagonale exacte (|Δi| = |Δj|) : seules les cases de la diagonale comptent, pas
 *     celles qu'elle frôle par un coin ;
 *   - sinon, quand le segment passe exactement par un coin, les deux cases qui se
 *     touchent à ce coin comptent : il suffit que l'une bloque.
 */
export function casesSurLaLigne(a: Case, b: Case): Case[] {
  const p = versLosange(a)
  const q = versLosange(b)
  const di = q.i - p.i
  const dj = q.j - p.j
  const ni = Math.abs(di)
  const nj = Math.abs(dj)
  const si = Math.sign(di)
  const sj = Math.sign(dj)
  const out: Case[] = []
  const ajouter = (i: number, j: number) => {
    if (i === q.i && j === q.j) return
    const c = depuisLosange(i, j)
    if (c !== null) out.push(c)
  }

  if (ni === nj) {
    for (let k = 1; k < ni; k++) ajouter(p.i + k * si, p.j + k * sj)
    return out
  }

  let { i, j } = p
  let pasI = 0
  let pasJ = 0
  while (pasI < ni || pasJ < nj) {
    // Comparaison, sans division, des moments où le segment franchit le prochain bord
    // en i et en j : (0,5 + pasI) / ni contre (0,5 + pasJ) / nj.
    const tI = (1 + 2 * pasI) * nj
    const tJ = (1 + 2 * pasJ) * ni
    if (tI === tJ) {
      ajouter(i + si, j)
      ajouter(i, j + sj)
      i += si
      j += sj
      pasI++
      pasJ++
    } else if (tI < tJ) {
      i += si
      pasI++
    } else {
      j += sj
      pasJ++
    }
    ajouter(i, j)
  }
  return out
}

export function ligneDeVue(p: Plateau, a: Case, b: Case): boolean {
  return casesSurLaLigne(a, b).every(c => !bloqueLdv(p, c))
}
