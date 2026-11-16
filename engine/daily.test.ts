import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { categorie } from './categories'
import { ENNEMIS_DAILY, aleaDe, candidatsDaily, jourDe, mapDuJour, salleDuJour } from './daily'
import { creerPlateau, placements, type MapCombat } from './plateau'
import { equipes } from './salle'

const { maps } = JSON.parse(readFileSync(new URL('../data/maps.json', import.meta.url), 'utf-8')) as { maps: MapCombat[] }
const index = maps.map(m => ({ id: m.id, categorie: categorie(m), places: placements(creerPlateau(m.cases), equipes(m).ennemie).length }))

describe('défi du jour', () => {
  it('change de jour à minuit, heure de Paris', () => {
    expect(jourDe(new Date('2026-11-16T22:59:00Z'))).toBe('2026-11-16')
    expect(jourDe(new Date('2026-11-16T23:00:00Z'))).toBe('2026-11-17')
  })

  it('tire le même hasard pour la même graine', () => {
    const a = aleaDe('map:2026-11-16')
    const b = aleaDe('map:2026-11-16')
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
    expect(aleaDe('map:2026-11-17')()).not.toBe(aleaDe('map:2026-11-16')())
  })

  it('tire une zone ou un Songe avec 6 à 8 ennemis, la même pour tous', () => {
    const candidats = candidatsDaily(index)
    expect(candidats.length).toBeGreaterThan(100)
    for (const jour of ['2026-11-16', '2026-11-17', '2027-02-28']) {
      const choisie = mapDuJour(candidats, jour)!
      expect(['zone', 'songes']).toContain(choisie.categorie)
      // Le même tirage d'un ordre différent de la liste : la même map
      expect(mapDuJour(candidatsDaily([...index].reverse()), jour)?.id).toBe(choisie.id)
      const map = maps.find(m => m.id === choisie.id)!
      const salle = salleDuJour(map, jour)
      expect(salle.ennemis.length).toBeGreaterThanOrEqual(ENNEMIS_DAILY[0])
      expect(salle.ennemis.length).toBeLessThanOrEqual(ENNEMIS_DAILY[1])
      expect(salleDuJour(map, jour).ennemis).toEqual(salle.ennemis)
    }
  })

  it('écarte les maps exclues', () => {
    const candidats = candidatsDaily(index)
    const jour = '2026-11-16'
    const choisie = mapDuJour(candidats, jour)!
    expect(mapDuJour(candidatsDaily(index, new Set([choisie.id])), jour)?.id).not.toBe(choisie.id)
  })
})
