import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { categorie } from './categories'
import { ACTIONS_MAX, ENNEMIS_DAILY, aleaDe, candidatsDaily, fuiteDuJour, jourDe, mapDuJour, nettoyerTour, rejouerDefi, salleDuJour } from './daily'
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

describe('tour du défi', () => {
  it('rejoue le tour envoyé : un tour fini compte, un tour truqué non', () => {
    const jour = '2026-11-16'
    const choisie = mapDuJour(candidatsDaily(index), jour)!
    const salle = salleDuJour(maps.find(m => m.id === choisie.id)!, jour)
    const sadida = casesDuJoueur(salle.map)[0]!
    const fin = { type: 'fin' as const, acteur: 0 }
    expect(rejouerDefi(salle, { jour, joueur: 'x', sadida, sorts: [], prycipithon: false, actions: [fin] })).toMatchObject({ points: 0, etoiles: 0 })
    // Pas fini, mauvaise case, action impossible : refusés
    expect(rejouerDefi(salle, { jour, joueur: 'x', sadida, sorts: [], prycipithon: false, actions: [] })).toBeNull()
    expect(rejouerDefi(salle, { jour, joueur: 'x', sadida: salle.ennemis[0]!, sorts: [], prycipithon: false, actions: [fin] })).toBeNull()
    expect(rejouerDefi(salle, { jour, joueur: 'x', sadida, sorts: [], prycipithon: false, actions: [{ type: 'deplacement', acteur: 0, vers: -5 }, fin] })).toBeNull()
    expect(rejouerDefi(salle, { jour, joueur: 'x', sadida, sorts: [], prycipithon: false, actions: [{ type: 'n-importe-quoi' } as never] })).toBeNull()
  })
})

describe('tour reçu par l’API', () => {
  const tour = {
    jour: '2026-11-20', joueur: '0123abcd-0123-4abc-8abc-0123456789ab', sadida: 300, sorts: [13519, 13516], prycipithon: false,
    actions: [{ type: 'sort', acteur: 1, sort: 13516, cible: 280 }, { type: 'deplacement', acteur: 1, vers: 301 }, { type: 'fin', acteur: 1 }],
  }

  it('garde un tour bien formé', () => {
    expect(nettoyerTour(tour)).toEqual(tour)
  })

  it('ne recopie que les champs utiles', () => {
    const gonfle = { ...tour, pirate: 'x'.repeat(1000), actions: [{ ...tour.actions[0], bourrage: 'x'.repeat(1000) }] }
    const propre = nettoyerTour(gonfle)!
    expect(JSON.stringify(propre)).not.toContain('xxx')
    expect(propre.actions).toEqual([tour.actions[0]])
  })

  it('refuse un tour mal formé', () => {
    for (const mauvais of [
      null, 'texte', 42,
      { ...tour, jour: 'hier' },
      { ...tour, joueur: 'moi' },
      { ...tour, sadida: 560 },
      { ...tour, sadida: '300' },
      { ...tour, sorts: Array(23).fill(13516) },
      { ...tour, sorts: ['13516'] },
      { ...tour, actions: 'rien' },
      { ...tour, actions: Array(ACTIONS_MAX + 1).fill(tour.actions[2]) },
      { ...tour, actions: [{ type: 'teleport', acteur: 1 }] },
      { ...tour, actions: [{ type: 'sort', acteur: 1, sort: 13516, cible: -1 }] },
    ]) expect(nettoyerTour(mauvais)).toBeNull()
  })
})

describe('Fuite du jour', () => {
  it('va de 0 à 160 par tranches de 10, la même pour tous ce jour-là', () => {
    const jours = Array.from({ length: 60 }, (_, k) => jourDe(new Date(Date.UTC(2026, 0, 1 + k, 12))))
    const fuites = jours.map(fuiteDuJour)
    expect(fuites.every(f => f % 10 === 0 && f >= 0 && f <= 160)).toBe(true)
    expect(new Set(fuites).size).toBeGreaterThan(5)
    expect(fuiteDuJour('2026-11-24')).toBe(fuiteDuJour('2026-11-24'))
  })
})
