import { describe, expect, it } from 'vitest'
import { casesCiblables, poMax, refusCible, type ReglesPortee } from './portee'
import { MILIEU as A, decale, plateauTest } from './test-outils'

const sort = (r: Partial<ReglesPortee> = {}): ReglesPortee => ({ po_min: 1, po_max: 4, ligne_de_vue: true, ...r })

describe('portée', () => {
  it('ajoute le bonus de PO seulement si la PO est modifiable', () => {
    expect(poMax(sort(), 6)).toBe(4)
    expect(poMax(sort({ po_modifiable: true }), 6)).toBe(10)
    expect(poMax(sort({ po_modifiable: true, po_min: 2, po_max: 3 }), -5)).toBe(2)
  })

  it('respecte la PO min et max', () => {
    const p = plateauTest()
    expect(refusCible(p, A, A, sort())).toBe('hors de portée')
    expect(refusCible(p, A, decale(A, 4, 0), sort())).toBeNull()
    expect(refusCible(p, A, decale(A, 3, 2), sort())).toBe('hors de portée')
    expect(refusCible(p, A, decale(A, 3, 2), sort({ po_modifiable: true }), 1)).toBeNull()
  })

  it('compte les cases visables', () => {
    // anneau de rayon 1 à 4 : 4 + 8 + 12 + 16
    expect(casesCiblables(plateauTest(), A, sort())).toHaveLength(40)
    expect(casesCiblables(plateauTest(), A, sort({ en_ligne: true }))).toHaveLength(16)
    expect(casesCiblables(plateauTest(), A, sort({ en_diagonale: true, po_min: 2 }))).toHaveLength(8)
    expect(casesCiblables(plateauTest(), A, sort({ en_ligne: true, en_diagonale: true }))).toHaveLength(24)
  })

  it('refuse les obstacles, le vide et, si demandé, les cases occupées', () => {
    const b = decale(A, 2, 0)
    expect(refusCible(plateauTest([[b, '#']]), A, b, sort())).toBe('case non ciblable')
    expect(refusCible(plateauTest([[b, '.']]), A, b, sort())).toBe('case non ciblable')
    expect(refusCible(plateauTest([], [b]), A, b, sort())).toBeNull()
    expect(refusCible(plateauTest([], [b]), A, b, sort({ case_libre: true }))).toBe('case occupée')
  })

  it('demande la ligne de vue sauf si le sort ne la demande pas', () => {
    const p = plateauTest([], [decale(A, 1, 0)])
    const b = decale(A, 3, 0)
    expect(refusCible(p, A, b, sort())).toBe('pas de ligne de vue')
    expect(refusCible(p, A, b, sort({ ligne_de_vue: false }))).toBeNull()
  })
})
