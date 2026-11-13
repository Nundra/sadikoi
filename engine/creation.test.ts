import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MAX_ENNEMIS, carteDepuisSalle, carteVide, codeCarte, departsDe, ennemisDe, lireCodeCarte, peindre, problemesCarte,
} from './creation'
import { NB_CASES } from './grille'
import type { MapCombat } from './plateau'

const { maps } = JSON.parse(readFileSync(new URL('../data/maps.json', import.meta.url), 'utf-8')) as { maps: MapCombat[] }

describe('créateur de map', () => {
  it('peint les cases avec chaque outil', () => {
    let m = carteVide()
    m = peindre(m, 10, 'vide')
    m = peindre(m, 11, 'obstacle')
    m = peindre(m, 12, 'depart')
    m = peindre(m, 13, 'ennemi')
    expect(m.slice(10, 14)).toBe('.#rb')
    expect(m).toHaveLength(NB_CASES)
    expect(peindre(m, 13, 'ennemi')).toBe(m)
    expect(departsDe(m)).toEqual([12])
    expect(ennemisDe(m)).toEqual([13])
  })

  it('dit ce qui manque pour jouer', () => {
    expect(problemesCarte(carteVide())).toEqual(['sans-depart', 'sans-ennemi'])
    let m = peindre(peindre(carteVide(), 0, 'depart'), 1, 'ennemi')
    expect(problemesCarte(m)).toEqual([])
    for (let c = 2; c < 2 + MAX_ENNEMIS; c++) m = peindre(m, c, 'ennemi')
    expect(problemesCarte(m)).toEqual(['trop-d-ennemis'])
  })

  it('part d’une salle du jeu en gardant seulement ses ennemis', () => {
    const map = maps.find(m => m.id === 121374211)!
    const ennemis = [...map.cases].flatMap((l, c) => (l === 'b' ? [c] : [])).slice(0, 3)
    const m = carteDepuisSalle(map, ennemis)
    expect(ennemisDe(m)).toEqual(ennemis)
    expect(departsDe(m)).toEqual([...map.cases].flatMap((l, c) => (l === 'r' ? [c] : [])))
  })

  it('code et relit une map à l’identique, en restant court', () => {
    for (const map of maps.slice(0, 200)) {
      const code = codeCarte(map.cases)
      expect(lireCodeCarte(code)).toBe(map.cases)
    }
    const m = peindre(peindre(carteVide(), 40, 'depart'), 300, 'ennemi')
    expect(codeCarte(m)).toBe('1S14DS77ES77')
    expect(lireCodeCarte(codeCarte(m))).toBe(m)
  })

  it('refuse un code abîmé', () => {
    expect(lireCodeCarte('')).toBeNull()
    expect(lireCodeCarte('1S14')).toBeNull()
    expect(lireCodeCarte('2Sfk')).toBeNull()
    expect(lireCodeCarte('1Sfl')).toBeNull()
    expect(lireCodeCarte('1Q2')).toBeNull()
  })
})
