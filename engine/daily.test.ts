import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { categorie } from './categories'
import { ENNEMIS_DAILY, aleaDe, candidatsDaily, insererClassement, jourDe, mapDuJour, rejouerDefi, salleDuJour } from './daily'
import { creerPlateau, placements, type MapCombat } from './plateau'
import { casesDuJoueur, equipes } from './salle'

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

describe('classement du défi', () => {
  const entree = (points: number, date: number) => ({ id: `${points}-${date}`, points, etoiles: 3, paDepenses: 4, prycipithon: false, date })

  it('garde une ligne par valeur de points, la plus ancienne', () => {
    const top = [entree(180, 1), entree(150, 2)]
    expect(insererClassement(top, entree(180, 3))).toBeNull()
    expect(insererClassement(top, entree(200, 4))?.map(e => e.points)).toEqual([200, 180, 150])
  })

  it('garde les 5 meilleurs, et refuse un score nul ou trop bas', () => {
    const top = [100, 90, 80, 70, 60].map((p, k) => entree(p, k))
    expect(insererClassement(top, entree(50, 9))).toBeNull()
    expect(insererClassement(top, entree(0, 9))).toBeNull()
    expect(insererClassement(top, entree(85, 9))?.map(e => e.points)).toEqual([100, 90, 85, 80, 70])
  })

  it('rejoue le tour envoyé : un tour fini compte, un tour truqué non', () => {
    const jour = '2026-11-16'
    const choisie = mapDuJour(candidatsDaily(index), jour)!
    const salle = salleDuJour(maps.find(m => m.id === choisie.id)!, jour)
    const sadida = casesDuJoueur(salle.map)[0]!
    const fin = { type: 'fin' as const, acteur: 0 }
    expect(rejouerDefi(salle, { jour, sadida, sorts: [], prycipithon: false, actions: [fin] })).toMatchObject({ points: 0, etoiles: 0 })
    // Pas fini, mauvaise case, action impossible : refusés
    expect(rejouerDefi(salle, { jour, sadida, sorts: [], prycipithon: false, actions: [] })).toBeNull()
    expect(rejouerDefi(salle, { jour, sadida: salle.ennemis[0]!, sorts: [], prycipithon: false, actions: [fin] })).toBeNull()
    expect(rejouerDefi(salle, { jour, sadida, sorts: [], prycipithon: false, actions: [{ type: 'deplacement', acteur: 0, vers: -5 }, fin] })).toBeNull()
    expect(rejouerDefi(salle, { jour, sadida, sorts: [], prycipithon: false, actions: [{ type: 'n-importe-quoi' } as never] })).toBeNull()
  })
})
