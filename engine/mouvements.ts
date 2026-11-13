import { depuisLosange, distance, versLosange, type Case } from './grille'

/** Les 8 directions du jeu dans le repère losange : 4 en ligne, 4 en diagonale. */
const DIRECTIONS: [number, number][] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]

// À l'écran, x = i + j et y = i - j : les 8 directions y sont espacées de 45°.
const angle = (di: number, dj: number) => Math.atan2(di - dj, di + dj)

/**
 * La direction de `a` vers `b` parmi les 8 du jeu : celle dont l'angle à l'écran est le
 * plus proche. Null si les deux cases sont la même.
 */
export function direction(a: Case, b: Case): [number, number] | null {
  const p = versLosange(a)
  const q = versLosange(b)
  const di = q.i - p.i
  const dj = q.j - p.j
  if (di === 0 && dj === 0) return null
  const voulu = angle(di, dj)
  let meilleure = DIRECTIONS[0]!
  let ecart = Infinity
  for (const d of DIRECTIONS) {
    const e = Math.abs(Math.atan2(Math.sin(angle(...d) - voulu), Math.cos(angle(...d) - voulu)))
    if (e < ecart - 1e-9) {
      ecart = e
      meilleure = d
    }
  }
  return meilleure
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
