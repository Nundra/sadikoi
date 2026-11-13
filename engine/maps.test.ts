import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { casesAccessibles } from './chemins'
import { NB_CASES } from './grille'
import { creerPlateau, marchable, placements, type MapCombat } from './plateau'

const { maps } = JSON.parse(readFileSync(new URL('../data/maps.json', import.meta.url), 'utf-8')) as { maps: MapCombat[] }
const BOUFTOU_ROYAL = 121374211

describe('data/maps.json', () => {
  it('a des maps de 560 cases avec des placements des deux couleurs', () => {
    expect(maps.length).toBeGreaterThan(3000)
    for (const m of maps) {
      expect(m.cases).toMatch(new RegExp(`^[_rbx#.]{${NB_CASES}}$`))
      const p = creerPlateau(m.cases)
      expect(placements(p, 'r').length, `${m.id}`).toBeGreaterThan(0)
      expect(placements(p, 'b').length, `${m.id}`).toBeGreaterThan(0)
    }
  })

  it('a la salle du Bouftou Royal, avec son boss', () => {
    const m = maps.find(m => m.id === BOUFTOU_ROYAL)!
    expect(m.donjon).toBe('Cour du Bouftou Royal')
    expect(m.boss).toEqual(['Bouftou Royal'])
  })

  it("relie chaque case de placement d'une salle de boss aux cases d'en face", () => {
    // Si ce test casse, c'est que la lecture des cases ou les déplacements sont faux :
    // dans le jeu, les deux équipes peuvent toujours se rejoindre.
    for (const m of maps.filter(m => m.boss)) {
      const p = creerPlateau(m.cases)
      const rouges = placements(p, 'r')
      const acc = casesAccessibles(p, rouges[0]!, NB_CASES)
      for (const c of [...rouges, ...placements(p, 'b')]) {
        expect(marchable(p, c)).toBe(true)
        expect(acc.has(c), `${m.nom} (${m.id}), case ${c}`).toBe(true)
      }
    }
  })
})
