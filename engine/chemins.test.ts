import { describe, expect, it } from 'vitest'
import { casesAccessibles, chemin } from './chemins'
import { distance } from './grille'
import { MILIEU as A, decale, plateauTest } from './test-outils'

describe('chemins', () => {
  it('atteint en n PM les cases à distance n sur une map vide', () => {
    const acc = casesAccessibles(plateauTest(), A, 3)
    // losange de rayon 3 : 1 + 4 + 8 + 12 cases
    expect(acc.size).toBe(25)
    for (const [c, cout] of acc) expect(cout).toBe(distance(A, c))
  })

  it('contourne un mur', () => {
    // mur de 3 cases devant A
    const mur = [-1, 0, 1].map(dj => [decale(A, 1, dj), '#'] as const)
    const p = plateauTest(mur)
    const b = decale(A, 2, 0)
    expect(chemin(p, A, b)).toHaveLength(6)
    expect(casesAccessibles(p, A, 5).has(b)).toBe(false)
    expect(casesAccessibles(p, A, 6).get(b)).toBe(6)
  })

  it('ne traverse pas les entités ni le vide', () => {
    const p = plateauTest([[decale(A, 0, 1), '.']], [decale(A, 1, 0), decale(A, -1, 0), decale(A, 0, -1)])
    expect(casesAccessibles(p, A, 6).size).toBe(1)
    expect(chemin(p, A, decale(A, 3, 0))).toBeNull()
  })

  it('donne un chemin de proche en proche, sans la case de départ', () => {
    const b = decale(A, 2, -3)
    const ch = chemin(plateauTest(), A, b)!
    expect(ch).toHaveLength(5)
    expect(ch.at(-1)).toBe(b)
    ;[A, ...ch].slice(1).forEach((c, k) => expect(distance([A, ...ch][k]!, c)).toBe(1))
  })

  it('respecte la limite de PM', () => {
    expect(chemin(plateauTest(), A, decale(A, 4, 0), 3)).toBeNull()
    expect(chemin(plateauTest(), A, decale(A, 3, 0), 3)).toHaveLength(3)
  })
})
