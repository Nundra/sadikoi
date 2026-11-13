import { describe, expect, it } from 'vitest'
import { NB_CASES, depuisLosange, distance, enDiagonale, enLigne, versLosange, voisines } from './grille'

describe('grille', () => {
  it('passe en coordonnées losange et revient pour les 560 cases', () => {
    for (let c = 0; c < NB_CASES; c++) {
      const { i, j } = versLosange(c)
      expect(depuisLosange(i, j)).toBe(c)
    }
  })

  it('suit la formule du CLAUDE.md', () => {
    // case 15 : rangée 1, colonne 1 → x = 4, y = 2 → i = 3, j = 1
    expect(versLosange(15)).toEqual({ i: 3, j: 1 })
  })

  it('renvoie null hors de la map', () => {
    expect(depuisLosange(0, 0)).toBeNull()
    expect(depuisLosange(100, 0)).toBeNull()
  })

  it('mesure les distances', () => {
    expect(distance(0, 0)).toBe(0)
    // 0 et 14 (rangée suivante, décalée) se touchent ; 0 et 1 sont à 2 cases
    expect(distance(0, 14)).toBe(1)
    expect(distance(0, 1)).toBe(2)
    // deux rangées plus bas, même colonne : 2
    expect(distance(0, 28)).toBe(2)
    expect(distance(100, 300)).toBe(distance(300, 100))
  })

  it('donne 4 voisines au milieu, moins sur les bords', () => {
    expect(voisines(300)).toHaveLength(4)
    expect(voisines(0)).toEqual([14])
    for (const v of voisines(300)) expect(distance(300, v)).toBe(1)
  })

  it('reconnaît lignes et diagonales', () => {
    expect(enLigne(0, 14)).toBe(true)
    expect(enDiagonale(0, 1)).toBe(true) // même rangée : horizontale à l'écran
    expect(enDiagonale(0, 28)).toBe(true) // même colonne : verticale à l'écran
    expect(enLigne(0, 1)).toBe(false)
  })
})
