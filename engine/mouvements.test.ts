import { describe, expect, it } from 'vitest'
import type { Case } from './grille'
import { direction } from './mouvements'
import { SADIDA, jouer, nouvellePartie, rejouer, type Action, type Partie } from './partie'
import { SORTS_SADIDA } from './sorts'
import { MILIEU as A, decale, plateauTest } from './test-outils'

const id = (nom: string) => SORTS_SADIDA.find(s => s.nom === nom)!.id
const sort = (nom: string, cible: Case, acteur = SADIDA): Action => ({ type: 'sort', acteur, sort: id(nom), cible })

function suite(sorts: string[], ennemis: Case[], actions: Action[], obstacles: Case[] = []): Partie {
  const depart = nouvellePartie({ cases: plateauTest(obstacles.map(c => [c, '#'] as const)).cases, sadida: A, ennemis, sorts: sorts.map(id) })
  const r = rejouer(depart, actions)
  if (r.erreur) throw new Error(`action ${r.erreur.index} refusée : ${JSON.stringify(r.erreur.raison)}`)
  return r.partie
}
const caseDe = (p: Partie, nom: string) => p.entites.find(e => e.nom === nom)?.case

describe('direction', () => {
  it('suit les lignes, les diagonales, et arrondit le reste à la plus proche', () => {
    expect(direction(A, decale(A, 3, 0))).toEqual([1, 0])
    expect(direction(A, decale(A, -2, -2))).toEqual([-1, -1])
    expect(direction(A, decale(A, 3, 1))).toEqual([1, 0])
    expect(direction(A, A)).toBeNull()
  })
})

describe('Tremblement', () => {
  it('attire de 2 cases vers le lanceur les entités en cercle de 3', () => {
    const p = suite(['Tremblement'], [decale(A, 3, 0), decale(A, 0, -2), decale(A, 4, 0)], [sort('Tremblement', A)])
    expect(caseDe(p, 'Ennemi 1')).toBe(decale(A, 1, 0))
    expect(caseDe(p, 'Ennemi 2')).toBe(decale(A, 0, -1)) // s'arrête au contact
    expect(caseDe(p, 'Ennemi 3')).toBe(decale(A, 4, 0)) // hors zone
  })

  it("s'arrête contre un obstacle ou une autre entité", () => {
    const p = suite(['Tremblement'], [decale(A, 3, 0), decale(A, 1, 0)], [sort('Tremblement', A)], [decale(A, 0, 2)])
    expect(caseDe(p, 'Ennemi 2')).toBe(decale(A, 1, 0))
    expect(caseDe(p, 'Ennemi 1')).toBe(decale(A, 2, 0))
  })

  it('joue autour d’un Arbre Feuillu, et refuse une case quelconque', () => {
    const arbre = decale(A, 0, 6)
    const p = suite(['Tremblement', 'Arbre Feuillu'], [decale(A, 3, 6)], [sort('Arbre Feuillu', arbre), sort('Tremblement', arbre)])
    expect(caseDe(p, 'Ennemi 1')).toBe(decale(A, 1, 6))
    const r = jouer(p, sort('Tremblement', decale(A, 2, 2)))
    expect(r).toEqual({ ok: false, raison: { code: 'viser-centre-tremblement' } })
  })
})

describe('Groute, Tréant et La Gonflable', () => {
  // Arbre Feuillu en (2, 0), remplacé par l'invocation, puis fin du tour du Sadida
  const arbre = decale(A, 2, 0)
  const invoquer = (nom: string): Action[] => [sort('Arbre Feuillu', arbre), sort(nom, arbre), { type: 'fin', acteur: SADIDA }]

  it('Rejet Sylvestre infecte la première entité sur la ligne et la pousse jusqu’à la case visée', () => {
    const p0 = suite(['Arbre Feuillu', 'Puissance Sylvestre'], [decale(A, 4, 0)], invoquer('Puissance Sylvestre'))
    const groute = p0.ordre[1]!
    const r = jouer(p0, { type: 'sort', acteur: groute, sort: 13536, cible: decale(A, 8, 0) })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(caseDe(r.partie, 'Ennemi 1')).toBe(decale(A, 8, 0))
    expect(r.partie.entites.find(e => e.nom === 'Ennemi 1')?.infecte).toBe(true)
  })

  it('Étreinte Sylvestre infecte la première entité au-delà de la case visée et l’attire jusqu’à elle', () => {
    const p0 = suite(['Arbre Feuillu', 'Influence Végétale'], [decale(A, 8, 0)], invoquer('Influence Végétale'))
    const treant = p0.ordre[1]!
    const r = jouer(p0, { type: 'sort', acteur: treant, sort: 13591, cible: decale(A, 4, 0) })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(caseDe(r.partie, 'Ennemi 1')).toBe(decale(A, 4, 0))
    expect(r.partie.entites.find(e => e.nom === 'Ennemi 1')?.infecte).toBe(true)
  })

  it('Brise Automnale repousse de 4 cases les entités en diagonale', () => {
    const p0 = suite(['Arbre Feuillu', 'La Gonflable'], [decale(A, 3, 1), decale(A, 3, 0)], invoquer('La Gonflable'))
    const gonflable = p0.ordre[1]!
    const r = jouer(p0, { type: 'sort', acteur: gonflable, sort: 29624, cible: arbre })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(caseDe(r.partie, 'Ennemi 1')).toBe(decale(A, 7, 5))
    expect(caseDe(r.partie, 'Ennemi 2')).toBe(decale(A, 3, 0)) // en ligne : pas touché
  })
})

describe('La Bloqueuse et La Surpuissante', () => {
  const fin = (acteur: number): Action => ({ type: 'fin', acteur })

  it('Substitution échange La Bloqueuse avec un allié, Célérité lui donne 4 PM', () => {
    const bloqueuse = decale(A, 1, 0)
    const sacrifiee = decale(A, 0, 2)
    // La Sacrifiée d'abord, La Bloqueuse ensuite : La Bloqueuse joue la première
    const p0 = suite(['La Bloqueuse Transmutée', 'La Sacrifiée Transmutée'], [decale(A, 8, 0)],
      [sort('La Sacrifiée Transmutée', sacrifiee), sort('La Bloqueuse Transmutée', bloqueuse), fin(SADIDA)])
    const b = p0.entites.find(e => e.nom === 'La Bloqueuse')!.id
    expect(p0.ordre[1]).toBe(b)
    const apres = rejouer(p0, [
      { type: 'sort', acteur: b, sort: 29623, cible: bloqueuse }, // Célérité
      { type: 'sort', acteur: b, sort: 18669, cible: sacrifiee }, // Substitution
    ])
    expect(apres.erreur).toBeUndefined()
    expect(caseDe(apres.partie, 'La Bloqueuse')).toBe(sacrifiee)
    expect(caseDe(apres.partie, 'La Sacrifiée')).toBe(bloqueuse)
    expect(apres.partie.entites.find(e => e.nom === 'La Bloqueuse')?.pm).toBe(5 + 4)
    // Substitution sur un ennemi ou une case vide : refusée
    expect(jouer(p0, { type: 'sort', acteur: b, sort: 18669, cible: decale(A, 1, 2) })).toEqual({ ok: false, raison: { code: 'viser-allie' } })
  })

  it('Ardeur Estivale donne 3 PM à La Sacrifiée, qui atteint un ennemi trop loin sans eux', () => {
    const ennemi = decale(A, 0, 9)
    const sacrifiee = decale(A, 0, 2)
    // La Sacrifiée d'abord, La Surpuissante ensuite : La Surpuissante joue avant elle
    const p0 = suite(['La Surpuissante Transmutée', 'La Sacrifiée Transmutée'], [ennemi],
      [sort('La Sacrifiée Transmutée', sacrifiee), sort('La Surpuissante Transmutée', decale(A, 1, 0)), fin(SADIDA)])
    const [surpuissante, s] = p0.ordre.slice(1) as [number, number]
    // Sans le don : 4 PM ne suffisent pas pour aller au contact (case (0, 8), à 6 cases)
    const sans = rejouer(p0, [fin(surpuissante), { type: 'deplacement', acteur: s, vers: decale(A, 0, 8) }])
    expect(sans.erreur?.raison).toEqual({ code: 'hors-atteinte', p: { pm: 4 } })
    const avec = rejouer(p0, [
      { type: 'sort', acteur: surpuissante, sort: 14381, cible: sacrifiee }, // Ardeur Estivale
      fin(surpuissante),
      { type: 'deplacement', acteur: s, vers: decale(A, 0, 8) },
      { type: 'sort', acteur: s, sort: 14385, cible: decale(A, 0, 8) }, // Explosion Ouatée
    ])
    expect(avec.erreur).toBeUndefined()
    expect(avec.partie.entites.find(e => e.genre === 'ennemi')?.infecte).toBe(true)
  })
})

describe('tacle', () => {
  it('empêche de quitter le contact d’un ennemi', () => {
    const p = suite(['Vent Empoisonné'], [decale(A, 1, 0)], [])
    expect(jouer(p, { type: 'deplacement', acteur: SADIDA, vers: decale(A, -2, 0) }))
      .toEqual({ ok: false, raison: { code: 'tacle', p: { e: { id: 0, genre: 'sadida' } } } })
  })

  it('arrête le déplacement sur la première case au contact', () => {
    // Ennemi en (4, 0) : on peut aller en (3, 0), au contact
    const p = suite(['Vent Empoisonné'], [decale(A, 4, 0)], [])
    expect(jouer(p, { type: 'deplacement', acteur: SADIDA, vers: decale(A, 3, 0) }).ok).toBe(true)
    // Derrière lui, (5, 0) : en ligne droite il faudrait repartir du contact ; le contourner à distance coûte plus de 6 PM
    expect(jouer(p, { type: 'deplacement', acteur: SADIDA, vers: decale(A, 5, 0) }).ok).toBe(false)
  })

  it('ne s’applique plus à La Bloqueuse après Célérité (Intaclable)', () => {
    const bloqueuse = decale(A, 1, 0)
    const p0 = suite(['La Bloqueuse Transmutée'], [decale(A, 2, 0)], [sort('La Bloqueuse Transmutée', bloqueuse), { type: 'fin', acteur: SADIDA }])
    const b = p0.ordre[1]!
    expect(jouer(p0, { type: 'deplacement', acteur: b, vers: decale(A, 1, 3) }).ok).toBe(false)
    const r = rejouer(p0, [{ type: 'sort', acteur: b, sort: 29623, cible: bloqueuse }, { type: 'deplacement', acteur: b, vers: decale(A, 1, 3) }])
    expect(r.erreur).toBeUndefined()
    expect(caseDe(r.partie, 'La Bloqueuse')).toBe(decale(A, 1, 3))
  })
})
