import { describe, expect, it } from 'vitest'
import type { Case } from './grille'
import { SADIDA, STATS_DEFAUT, acteurCourant, jouer, nouvellePartie, rejouer, score, termine, type Action, type Partie, type Stats } from './partie'
import { SORTS_SADIDA } from './sorts'
import { MILIEU as A, decale, plateauTest } from './test-outils'

const id = (nom: string) => SORTS_SADIDA.find(s => s.nom === nom)!.id

function partie(sorts: string[], ennemis: Case[], stats?: Stats): Partie {
  return nouvellePartie({ cases: plateauTest().cases, sadida: A, ennemis, sorts: sorts.map(id), stats })
}

/** Joue les actions et échoue clairement si l'une d'elles est refusée. */
function suite(p: Partie, actions: Action[]): Partie {
  const r = rejouer(p, actions)
  if (r.erreur) throw new Error(`action ${r.erreur.index} refusée : ${JSON.stringify(r.erreur.raison)}`)
  return r.partie
}

const sort = (nom: string, cible: Case, acteur = SADIDA): Action => ({ type: 'sort', acteur, sort: id(nom), cible })
const fin = (acteur: number): Action => ({ type: 'fin', acteur })
const infectes = (p: Partie) => p.entites.filter(e => e.genre === 'ennemi' && e.infecte).map(e => e.id)

describe('partie', () => {
  it('refuse deux variantes de la même paire', () => {
    expect(() => partie(['La Folle', 'La Folle Transmutée'], [])).toThrow(/une seule variante/)
  })

  it('infecte la cible et dépense les PA', () => {
    const p = partie(['Vent Empoisonné'], [decale(A, 3, 0)])
    const r = jouer(p, sort('Vent Empoisonné', decale(A, 3, 0)))
    expect(r.ok && r.bilan.infectes).toEqual([1])
    expect(r.ok && r.partie.entites[0]!.pa).toBe(10)
    expect(p.entites[1]!.infecte).toBeUndefined() // la partie de départ n'a pas bougé
  })

  it('vérifie chaque lancer', () => {
    const e = decale(A, 3, 0)
    const p = partie(['Vent Empoisonné', 'Arbre'], [e])
    expect(jouer(p, sort('Mandragore', e))).toEqual({ ok: false, raison: { code: 'sort-absent', p: { e: { id: 0, genre: 'sadida' }, sort: id('Mandragore') } } })
    expect(jouer(suite(p, [sort('Vent Empoisonné', e)]), sort('Vent Empoisonné', e)))
      .toEqual({ ok: false, raison: { code: 'lancers-par-tour', p: { sort: id('Vent Empoisonné'), n: 1 } } })
    expect(jouer(p, sort('Vent Empoisonné', decale(A, 8, -8)))).toEqual({ ok: false, raison: { code: 'hors-portee' } })
    const fatigue = nouvellePartie({ cases: p.cases, sadida: A, ennemis: [e], sorts: [id('Vent Empoisonné')], stats: { pa: 1, pm: 0, po: 0 } })
    expect(jouer(fatigue, sort('Vent Empoisonné', e))).toEqual({ ok: false, raison: { code: 'pa-insuffisants', p: { pa: 1, cout: 2 } } })
    // un Arbre entre le Sadida et l'ennemi coupe la ligne de vue
    expect(jouer(suite(p, [sort('Arbre', decale(A, 1, 0))]), sort('Vent Empoisonné', e)))
      .toEqual({ ok: false, raison: { code: 'pas-de-ldv' } })
  })

  it('refuse les sorts qui ont une relance initiale', () => {
    expect(jouer(partie(['Rempotage'], []), sort('Rempotage', decale(A, 2, 0))))
      .toEqual({ ok: false, raison: { code: 'relance-initiale', p: { sort: id('Rempotage') } } })
  })

  it("n'a pas de zone autour d'un Arbre normal, mais autour d'un Arbre Feuillu", () => {
    const arbre = decale(A, 4, 0)
    const ennemis = [decale(A, 5, 0), decale(A, 4, 2)]
    const normal = suite(partie(['Arbre', 'Ronce'], ennemis), [sort('Arbre', arbre), sort('Ronce', arbre)])
    expect(infectes(normal)).toEqual([])
    const feuillu = suite(partie(['Arbre Feuillu', 'Ronce'], ennemis), [sort('Arbre Feuillu', arbre), sort('Ronce', arbre)])
    expect(infectes(feuillu)).toEqual([1, 2])
  })

  it('rend Feuillu un Arbre avec Larme de Sadida, puis Miasmes joue autour de lui', () => {
    const arbre = decale(A, 6, 0)
    const ennemis = [decale(A, 1, 1), decale(A, 7, 1), decale(A, 0, 6)]
    const sans = suite(partie(['Arbre', 'Miasmes'], ennemis), [sort('Arbre', arbre), sort('Miasmes', A)])
    expect(infectes(sans)).toEqual([1])
    const avec = suite(partie(['Arbre', 'Larme de Sadida', 'Miasmes'], ennemis),
      [sort('Arbre', arbre), sort('Larme de Sadida', arbre), sort('Miasmes', A)])
    expect(infectes(avec)).toEqual([1, 2])
  })

  it('propage avec Contagion seulement depuis un ennemi Infecté', () => {
    const e1 = decale(A, 4, 0)
    const ennemis = [e1, decale(A, 5, 1), decale(A, 4, -2), decale(A, 7, 0)]
    const p = partie(['Contagion', 'Vent Empoisonné'], ennemis)
    expect(infectes(suite(p, [sort('Contagion', e1)]))).toEqual([])
    expect(infectes(suite(p, [sort('Vent Empoisonné', e1), sort('Contagion', e1)]))).toEqual([1, 2, 3])
  })

  it("compte les exploitations, 3 au plus par tour", () => {
    const e = [decale(A, 3, 0), decale(A, 0, 3)]
    let p = partie(['Vent Empoisonné', 'Fléau', 'Ronce'], e, { ...STATS_DEFAUT, pa: 20 })
    p = suite(p, [sort('Vent Empoisonné', e[0]!), sort('Fléau', e[0]!), sort('Fléau', e[0]!), sort('Ronce', e[0]!)])
    expect(p.exploitations).toBe(3)
    const r = jouer(p, sort('Ronce', e[0]!))
    expect(r.ok && r.bilan.texte).toContainEqual({ code: 'pas-exploitation', p: { max: 3 } })
    // Fléau sur un ennemi sain : pas d'exploitation
    expect(suite(partie(['Fléau'], e), [sort('Fléau', e[1]!)]).exploitations).toBe(0)
  })

  it('fait jouer les invocations après le Sadida, la dernière invoquée en premier, à chaque fin de tour', () => {
    const e = decale(A, 6, 0)
    let p = partie(['La Folle Transmutée', 'La Sacrifiée Transmutée', 'Vent Empoisonné'], [e])
    // La Sacrifiée d'abord, La Folle ensuite : c'est La Folle qui jouera la première
    p = suite(p, [sort('La Sacrifiée Transmutée', decale(A, -1, 0)), sort('La Folle Transmutée', decale(A, 1, 0))])
    const [folle, sacrifiee] = p.ordre.slice(1)
    expect(p.entites.find(x => x.id === folle)?.nom).toBe('La Folle')
    expect(p.entites.find(x => x.id === sacrifiee)?.nom).toBe('La Sacrifiée')
    // Tant que le Sadida n'a pas fini, La Folle attend
    expect(jouer(p, { type: 'deplacement', acteur: folle!, vers: decale(A, 3, 0) }))
      .toEqual({ ok: false, raison: { code: 'tour-de', p: { e: { id: 0, genre: 'sadida' } } } })
    p = suite(p, [
      fin(SADIDA),
      { type: 'deplacement', acteur: folle!, vers: decale(A, 3, 0) },
      { type: 'sort', acteur: folle!, sort: 14380, cible: e }, // Agacement
    ])
    expect(infectes(p)).toEqual([1])
    expect(acteurCourant(p)?.id).toBe(folle)
    expect(jouer(p, sort('Vent Empoisonné', e))).toEqual({ ok: false, raison: { code: 'tour-de', p: { e: { id: folle!, genre: 'invocation', monstre: 5896 } } } })
    // La Sacrifiée joue ensuite ; après elle, la salle est finie
    p = suite(p, [fin(folle!), { type: 'deplacement', acteur: sacrifiee!, vers: decale(A, -2, 0) }])
    expect(jouer(p, { type: 'deplacement', acteur: folle!, vers: decale(A, 4, 0) }))
      .toEqual({ ok: false, raison: { code: 'tour-de', p: { e: { id: sacrifiee!, genre: 'invocation', monstre: 5898 } } } })
    expect(termine(p)).toBe(false)
    const r = jouer(p, fin(sacrifiee!))
    expect(r.ok && r.bilan.texte.map(m => m.code)).toEqual(['titre-fin', 'fin-salle'])
    expect(r.ok && termine(r.partie)).toBe(true)
  })

  it("fait exploser La Sacrifiée seulement au contact d'un ennemi", () => {
    const ennemis = [decale(A, 5, 0), decale(A, 5, 1), decale(A, 9, 0)]
    let p = partie(['La Sacrifiée Transmutée'], ennemis)
    p = suite(p, [sort('La Sacrifiée Transmutée', decale(A, 1, 0)), fin(SADIDA)])
    const s = p.ordre[1]!
    const exploser = (c: Case): Action => ({ type: 'sort', acteur: s, sort: 14385, cible: c })
    expect(jouer(p, exploser(decale(A, 1, 0)))).toEqual({ ok: false, raison: { code: 'aucun-ennemi-contact' } })
    expect(jouer(p, { type: 'deplacement', acteur: s, vers: decale(A, 6, 0) }))
      .toEqual({ ok: false, raison: { code: 'hors-atteinte', p: { pm: 4 } } })
    p = suite(p, [{ type: 'deplacement', acteur: s, vers: decale(A, 4, 0) }, exploser(decale(A, 4, 0))])
    expect(infectes(p)).toEqual([1, 2])
    expect(p.entites.some(e => e.id === s)).toBe(false)
  })

  it('remplace un Arbre Feuillu par le Groute, pas un Arbre normal', () => {
    const arbre = decale(A, 2, 0)
    const p = partie(['Arbre', 'Larme de Sadida', 'Puissance Sylvestre'], [])
    const normal = suite(p, [sort('Arbre', arbre)])
    expect(jouer(normal, sort('Puissance Sylvestre', arbre))).toEqual({ ok: false, raison: { code: 'viser-arbre-feuillu' } })
    const groute = suite(p, [sort('Arbre', arbre), sort('Larme de Sadida', arbre), sort('Puissance Sylvestre', arbre)])
    expect(groute.entites.find(e => e.case === arbre)?.nom).toBe('Groute')
    expect(groute.ordre).toHaveLength(2)
  })

  it('sacrifie une Poupée avec Sacrifice Vaudou', () => {
    const poupee = decale(A, 0, 2)
    const ennemis = [decale(A, 1, 3), decale(A, 0, 6)]
    const p = suite(partie(['La Bloqueuse Transmutée', 'Sacrifice Vaudou'], ennemis),
      [sort('La Bloqueuse Transmutée', poupee), sort('Sacrifice Vaudou', poupee)])
    expect(infectes(p)).toEqual([1])
    expect(p.entites.some(e => e.nom === 'La Bloqueuse')).toBe(false)
  })

  it("retire l'Infection de tous avec Inoculation", () => {
    const e = [decale(A, 3, 0), decale(A, 0, 3)]
    const p = suite(partie(['Vent Empoisonné', 'Miasmes', 'Inoculation'], [...e, decale(A, 0, -1)]),
      [sort('Miasmes', A), sort('Vent Empoisonné', e[0]!), sort('Inoculation', e[0]!)])
    expect(infectes(p)).toEqual([])
  })

  it('compte les étoiles', () => {
    const ennemis = [decale(A, 1, 0), decale(A, 0, 1), decale(A, -1, 0), decale(A, 3, 3)]
    const p = partie(['Miasmes', 'Vent Empoisonné'], ennemis)
    expect(score(p)).toEqual({ infectes: 0, total: 4, part: 0, etoiles: 0, auTour2: 0, paDepenses: 0, paRestants: 12, points: 0 })
    const trois = suite(p, [sort('Miasmes', A)])
    expect(score(trois)).toMatchObject({ infectes: 3, etoiles: 2, paDepenses: 2, points: 75 })
    // tous infectés avec 4 PA : 100 + 10 × 8 PA restants
    expect(score(suite(p, [sort('Miasmes', A), sort('Vent Empoisonné', decale(A, 3, 3))])))
      .toMatchObject({ etoiles: 3, paDepenses: 4, paRestants: 8, points: 180 })
  })

  describe('4e étoile : tous encore infectés au tour 2', () => {
    const voisins = [decale(A, 1, 0), decale(A, 0, 1), decale(A, -1, 0)]

    it("ne la donne pas avec des infections d'un tour", () => {
      const p = suite(partie(['Miasmes'], voisins), [sort('Miasmes', A)])
      expect(score(p)).toMatchObject({ infectes: 3, auTour2: 0, etoiles: 3, points: 100 + 100 })
    })

    it('la donne avec Mandragore lancée sur un Infecté une fois tout le monde infecté', () => {
      const p = suite(partie(['Miasmes', 'Mandragore'], voisins), [sort('Miasmes', A), sort('Mandragore', decale(A, 1, 0))])
      expect(score(p)).toMatchObject({ etoiles: 4, auTour2: 3, paDepenses: 5, points: 100 + 70 + 50 })
      // Mandragore sur un ennemi sain : seulement lui
      const seul = suite(partie(['Mandragore'], voisins), [sort('Mandragore', decale(A, 1, 0))])
      expect(score(seul)).toMatchObject({ infectes: 1, auTour2: 1 })
    })

    it('ne fixe pas un ennemi infecté après Mandragore', () => {
      const p = suite(partie(['Vent Empoisonné', 'Mandragore', 'Miasmes'], [decale(A, 1, 0), decale(A, 0, 1), decale(A, 3, 3)]),
        [sort('Miasmes', A), sort('Mandragore', decale(A, 1, 0)), sort('Vent Empoisonné', decale(A, 3, 3))])
      expect(score(p)).toMatchObject({ infectes: 3, auTour2: 2, etoiles: 3 })
    })

    it('compte les infections de 2 tours ou plus (Sève Paralysante, Contagion)', () => {
      const e = [decale(A, 4, 0), decale(A, 5, 1)]
      const p = suite(partie(['Sève Paralysante', 'Contagion'], e), [sort('Sève Paralysante', e[0]!), sort('Contagion', e[0]!)])
      expect(p.entites.find(x => x.id === 1)?.dureeInfection).toBe(3)
      expect(p.entites.find(x => x.id === 2)?.dureeInfection).toBe(2)
      expect(score(p).etoiles).toBe(4)
    })

    it('prolonge à 3 tours avec Cigüe, sur la cible seulement', () => {
      const p = suite(partie(['Miasmes', 'Cigüe'], voisins), [sort('Miasmes', A), sort('Cigüe', decale(A, 1, 0))])
      expect(p.entites.filter(x => x.genre === 'ennemi').map(x => x.dureeInfection)).toEqual([3, 1, 1])
      expect(score(p)).toMatchObject({ auTour2: 1, etoiles: 3 })
    })

    it("compte une Infection d'un tour posée par une invocation : elle expire après le tour 2 du Sadida", () => {
      // Deux ennemis sous Mandragore, le troisième infecté par Agacement (La Folle, 1 tour)
      const e = [decale(A, 1, 0), decale(A, 0, 1), decale(A, -4, 0)]
      const p = suite(partie(['Miasmes', 'Mandragore', 'La Folle Transmutée'], e), [
        sort('Miasmes', A),
        sort('Mandragore', decale(A, 1, 0)),
        sort('La Folle Transmutée', decale(A, -1, 0)),
        fin(SADIDA),
      ])
      const folle = p.ordre[1]!
      const r = suite(p, [{ type: 'sort', acteur: folle, sort: 14380, cible: decale(A, -4, 0) }])
      expect(r.entites.find(x => x.id === 3)).toMatchObject({ dureeInfection: 1, infectionParInvocation: true })
      expect(score(r)).toMatchObject({ infectes: 3, auTour2: 3, etoiles: 4 })
      // La même Infection d'un tour posée par le Sadida (Vent Empoisonné) ne tient pas
      const vent = suite(partie(['Vent Empoisonné'], [decale(A, 3, 0)]), [sort('Vent Empoisonné', decale(A, 3, 0))])
      expect(score(vent)).toMatchObject({ infectes: 1, auTour2: 0, etoiles: 3 })
    })

    it('raccourcit avec Ronce Insolente, jusqu’à retirer une Infection d’un tour', () => {
      const p = suite(partie(['Miasmes', 'Ronce Insolente'], [decale(A, 1, 0), decale(A, 0, 1), decale(A, 4, 0)]),
        [sort('Miasmes', A), sort('Ronce Insolente', decale(A, 0, 1))])
      // Ronce Insolente exploite (la cible est Infectée) : tous les Infectés perdent un tour
      expect(score(p).infectes).toBe(0)
    })
  })

  it('donne 2 PA avec la Prycipithon Mate, contre 10 % des points', () => {
    const ennemis = [decale(A, 1, 0), decale(A, 0, 1), decale(A, -1, 0)]
    const avec = nouvellePartie({ cases: plateauTest().cases, sadida: A, ennemis, sorts: [id('Miasmes')], prycipithon: true })
    expect(avec.entites[0]!.pa).toBe(14)
    const p = suite(avec, [sort('Miasmes', A)])
    // 100 + 10 × 12 PA restants = 220, × 0,9
    expect(score(p)).toMatchObject({ etoiles: 3, paDepenses: 2, paRestants: 12, points: 198 })
  })

  it("annule en rejouant sans la dernière action, et signale celle qui n'est plus possible", () => {
    const arbre = decale(A, 2, 0)
    const p = partie(['Arbre', 'La Folle'], [])
    const actions = [sort('Arbre', arbre), sort('La Folle', arbre)]
    expect(rejouer(p, actions.slice(0, 1)).partie.entites.at(-1)?.nom).toBe('Arbre')
    expect(rejouer(p, actions.slice(1)).erreur).toEqual({ index: 0, raison: { code: 'viser-arbre' } })
  })
})
