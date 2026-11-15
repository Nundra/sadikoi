import { describe, expect, it } from 'vitest'
import { zoneDuSort } from './apercu'
import { SADIDA, jouer, nouvellePartie, type Partie } from './partie'
import { SORTS_SADIDA } from './sorts'
import { MILIEU as A, decale, plateauTest } from './test-outils'

const id = (nom: string) => SORTS_SADIDA.find(s => s.nom === nom)!.id

describe('aperçu de zone', () => {
  const depart = nouvellePartie({ cases: plateauTest().cases, sadida: A, ennemis: [decale(A, 4, 0)], sorts: [id('Miasmes'), id('Arbre Feuillu'), id('Ronce'), id('Contagion')] })

  it('donne la case visée pour un sort monocible', () => {
    expect(zoneDuSort(depart, SADIDA, id('Ronce'), decale(A, 4, 0))).toEqual([decale(A, 4, 0)])
  })

  it('donne le cercle de 2 de Contagion (13 cases) seulement sur un ennemi Infecté', () => {
    const e = decale(A, 4, 0)
    expect(zoneDuSort(depart, SADIDA, id('Contagion'), e)).toEqual([e])
    expect(zoneDuSort(depart, SADIDA, id('Contagion'), decale(A, 2, 0))).toEqual([decale(A, 2, 0)])
    const r = jouer(depart, { type: 'sort', acteur: SADIDA, sort: id('Ronce'), cible: e })
    expect(zoneDuSort((r as { partie: Partie }).partie, SADIDA, id('Contagion'), e)).toHaveLength(13)
  })

  it('ajoute le cercle autour des Arbres Feuillus pour Miasmes et Ronce', () => {
    const arbre = decale(A, 0, 8)
    const r = jouer(depart, { type: 'sort', acteur: SADIDA, sort: id('Arbre Feuillu'), cible: arbre })
    const p = (r as { partie: Partie }).partie
    expect(zoneDuSort(depart, SADIDA, id('Miasmes'), A)).toHaveLength(13)
    expect(zoneDuSort(p, SADIDA, id('Miasmes'), A)).toHaveLength(26)
    expect(zoneDuSort(p, SADIDA, id('Ronce'), arbre)).toHaveLength(13)
  })
})
