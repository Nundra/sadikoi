import { depuisLosange, distance, versLosange, type Case } from './grille'

/**
 * La direction d'une poussée ou d'une attirance de `a` vers `b`, comme le client Dofus 2
 * (`MapPoint.advancedOrientationTo`, en 4 directions) : en diagonale seulement si `b` est
 * exactement en diagonale de `a` ; sinon en ligne, sur l'axe où l'écart est le plus grand
 * (une entité décalée d'une case avance « en ligne », sans passer en biais). Null si les
 * deux cases sont la même.
 */
export function direction(a: Case, b: Case): [number, number] | null {
  const p = versLosange(a)
  const q = versLosange(b)
  const di = q.i - p.i
  const dj = q.j - p.j
  if (di === 0 && dj === 0) return null
  if (Math.abs(di) === Math.abs(dj)) return [Math.sign(di), Math.sign(dj)]
  return Math.abs(di) > Math.abs(dj) ? [Math.sign(di), 0] : [0, Math.sign(dj)]
}

export function avancer(c: Case, [di, dj]: [number, number]): Case | null {
  const { i, j } = versLosange(c)
  return depuisLosange(i + di, j + dj)
}

/**
 * Fait glisser une entité case par case dans une direction, au plus `n` cases, tant que la
 * case suivante est libre et que `continuer` l'accepte. Renvoie la case d'arrivée.
 */
export function glisser(
  depart: Case,
  dir: [number, number],
  n: number,
  libre: (c: Case) => boolean,
  continuer: (de: Case, vers: Case) => boolean = () => true,
): Case {
  let c = depart
  for (let k = 0; k < n; k++) {
    const suivante = avancer(c, dir)
    if (suivante === null || !libre(suivante) || !continuer(c, suivante)) break
    c = suivante
  }
  return c
}

/** Attire vers `centre` : on s'arrête dès qu'un pas n'en rapproche plus. */
export function attirer(depart: Case, centre: Case, n: number, libre: (c: Case) => boolean): Case {
  const dir = direction(depart, centre)
  if (!dir) return depart
  return glisser(depart, dir, n, libre, (de, vers) => distance(vers, centre) < distance(de, centre))
}

/** Repousse loin de `source`, dans la direction source → entité. */
export function repousser(depart: Case, source: Case, n: number, libre: (c: Case) => boolean): Case {
  const dir = direction(source, depart)
  return dir ? glisser(depart, dir, n, libre) : depart
}
