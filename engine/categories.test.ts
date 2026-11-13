import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { categorie, type Categorie } from './categories'
import type { MapCombat } from './plateau'

const { maps } = JSON.parse(readFileSync(new URL('../data/maps.json', import.meta.url), 'utf-8')) as { maps: MapCombat[] }
const de = (nom: string) => categorie(maps.find(m => m.nom === nom)!)

describe('catégories de map', () => {
  it('reconnaît chaque type', () => {
    expect(de('A18 - Sidimote II (Duel)')).toBe('koli')
    expect(de('Cour du Bouftou Royal - Cinquième salle')).toBe('donjon')
    expect(de('Songes Infinis')).toBe('songes')
    expect(de('Cartes de combat')).toBe('autre')
    expect(categorie(maps.find(m => m.nom === 'Fort Thune' && m.pos[0] === -5)!)).toBe('zone')
    expect(de('Tofulailler Royal - Cinquième salle')).not.toBe('zone') // copie de salle en [0, 0]
  })

  it('range toutes les maps', () => {
    const compte: Record<Categorie, number> = { zone: 0, speciale: 0, donjon: 0, koli: 0, songes: 0, autre: 0 }
    for (const m of maps) compte[categorie(m)]++
    expect(compte.koli).toBeGreaterThan(500)
    expect(compte.donjon).toBeGreaterThan(600)
    expect(compte.zone).toBeGreaterThan(200)
    expect(compte.autre).toBeLessThan(200)
  })
})

describe('zones normales', () => {
  it('ont toutes 10 ou 12 cases de placement par équipe et une position sur la carte du monde', () => {
    for (const m of maps.filter(m => categorie(m) === 'zone')) {
      const rouges = m.cases.split('r').length - 1
      expect([10, 12], m.nom).toContain(rouges)
      expect(m.cases.split('b').length - 1, m.nom).toBe(rouges)
      expect(m.pos, m.nom).not.toEqual([0, 0])
    }
  })
})
