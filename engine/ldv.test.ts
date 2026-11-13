import { describe, expect, it } from 'vitest'
import { casesSurLaLigne, ligneDeVue } from './ldv'
import { MILIEU as A, decale, plateauTest } from './test-outils'

describe('ligne de vue', () => {
  it('est libre sur une map vide', () => {
    expect(ligneDeVue(plateauTest(), A, decale(A, 5, 2))).toBe(true)
  })

  it('ne compte ni la case de départ ni la case visée', () => {
    const b = decale(A, 4, 0)
    expect(casesSurLaLigne(A, b)).toEqual([1, 2, 3].map(k => decale(A, k, 0)))
    expect(casesSurLaLigne(A, decale(A, 1, 0))).toEqual([])
    expect(ligneDeVue(plateauTest([], [A, b]), A, b)).toBe(true)
  })

  it('est coupée par un obstacle, une case « x » ou une entité sur la ligne', () => {
    const b = decale(A, 4, 0)
    const milieu = decale(A, 2, 0)
    expect(ligneDeVue(plateauTest([[milieu, '#']]), A, b)).toBe(false)
    expect(ligneDeVue(plateauTest([[milieu, 'x']]), A, b)).toBe(false)
    expect(ligneDeVue(plateauTest([], [milieu]), A, b)).toBe(false)
  })

  it("n'est pas coupée par du vide", () => {
    expect(ligneDeVue(plateauTest([[decale(A, 2, 0), '.']]), A, decale(A, 4, 0))).toBe(true)
  })

  it("n'est pas coupée par un obstacle à côté de la ligne", () => {
    expect(ligneDeVue(plateauTest([[decale(A, 2, 1), '#']]), A, decale(A, 4, 0))).toBe(true)
  })

  it('en diagonale exacte, ne regarde que les cases de la diagonale', () => {
    const b = decale(A, 3, 3)
    expect(casesSurLaLigne(A, b)).toEqual([decale(A, 1, 1), decale(A, 2, 2)])
    expect(ligneDeVue(plateauTest([[decale(A, 1, 0), '#'], [decale(A, 0, 1), '#']]), A, b)).toBe(true)
    expect(ligneDeVue(plateauTest([[decale(A, 1, 1), '#']]), A, b)).toBe(false)
  })

  it('au passage par un coin, est coupée si une des deux cases bloque', () => {
    // De (0, 0) à (3, 1), le segment passe par le coin entre (2, 0) et (1, 1).
    const b = decale(A, 3, 1)
    expect(new Set(casesSurLaLigne(A, b))).toEqual(new Set([
      decale(A, 1, 0), decale(A, 2, 0), decale(A, 1, 1), decale(A, 2, 1),
    ]))
    expect(ligneDeVue(plateauTest([[decale(A, 1, 1), '#']]), A, b)).toBe(false)
    expect(ligneDeVue(plateauTest([[decale(A, 2, 0), '#']]), A, b)).toBe(false)
  })

  it('est symétrique', () => {
    const p = plateauTest([[decale(A, 2, 1), '#'], [decale(A, -1, 3), '#'], [decale(A, 3, -2), '#']])
    for (let di = -5; di <= 5; di++) {
      for (let dj = -5; dj <= 5; dj++) {
        const b = decale(A, di, dj)
        expect(ligneDeVue(p, A, b), `(${di}, ${dj})`).toBe(ligneDeVue(p, b, A))
      }
    }
  })
})
