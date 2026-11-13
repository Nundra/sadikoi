import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { MapCombat } from './plateau'
import { EQUIPE_ENNEMIE, EQUIPE_JOUEUR, casesDuJoueur, codeSalle, equipes, lireCodeSalle, tirerSalle } from './salle'

const { maps } = JSON.parse(readFileSync(new URL('../data/maps.json', import.meta.url), 'utf-8')) as { maps: MapCombat[] }
const map = maps.find(m => m.id === 121374211)!

/** Générateur pseudo-aléatoire reproductible. */
function graine(n: number) {
  return () => ((n = (n * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
}

describe('salle', () => {
  it('place les ennemis sur des cases ennemies différentes', () => {
    for (let g = 1; g <= 20; g++) {
      const { ennemis } = tirerSalle(map, { alea: graine(g) })
      expect(ennemis.length).toBeGreaterThanOrEqual(3)
      expect(ennemis.length).toBeLessThanOrEqual(8)
      expect(new Set(ennemis).size).toBe(ennemis.length)
      for (const c of ennemis) expect(map.cases[c]).toBe(EQUIPE_ENNEMIE)
    }
  })

  it('est reproductible avec la même graine, et respecte le nombre demandé', () => {
    expect(tirerSalle(map, { alea: graine(7) })).toEqual(tirerSalle(map, { alea: graine(7) }))
    expect(tirerSalle(map, { nombre: 4 }).ennemis).toHaveLength(4)
    expect(tirerSalle(map, { nombre: 999 }).ennemis.length).toBeLessThan(999)
  })

  it('place le joueur sur les cases rouges et les ennemis sur les bleues, Songes compris', () => {
    const songe = maps.find(m => m.zone === 'Rêve du Monde des Douze')!
    for (const m of [map, songe]) {
      expect(equipes(m)).toEqual({ joueur: 'r', ennemie: 'b' })
      expect(tirerSalle(m, { nombre: 3 }).ennemis.every(c => m.cases[c] === 'b')).toBe(true)
      expect(casesDuJoueur(m).every(c => m.cases[c] === 'r')).toBe(true)
    }
  })

  it('donne les cases du joueur', () => {
    expect(casesDuJoueur(map).every(c => map.cases[c] === EQUIPE_JOUEUR)).toBe(true)
  })
})

describe('code de salle', () => {
  it('se relit à l’identique', () => {
    const { ennemis } = tirerSalle(map, { alea: graine(3) })
    const code = codeSalle(map, ennemis, ennemis.map((_, k) => k + 2))
    expect(code).toMatch(/^[0-9a-z]+-([0-9a-z]{3})+$/)
    expect(lireCodeSalle(code, maps)).toEqual({ map, ennemis, portraits: ennemis.map((_, k) => k + 2) })
    expect(lireCodeSalle(code.toUpperCase(), maps)?.ennemis).toEqual(ennemis)
  })

  it('refuse un code qui ne mène à aucune salle jouable', () => {
    const { ennemis } = tirerSalle(map, { alea: graine(3) })
    const code = codeSalle(map, ennemis)
    expect(lireCodeSalle('n’importe quoi', maps)).toBeNull()
    expect(lireCodeSalle(`zzzzzz-${code.split('-')[1]}`, maps)).toBeNull() // map inconnue
    expect(lireCodeSalle(codeSalle(map, [0]), maps)).toBeNull() // case 0 : pas une case ennemie
    expect(lireCodeSalle(codeSalle(map, [ennemis[0]!, ennemis[0]!]), maps)).toBeNull() // doublon
  })
})
