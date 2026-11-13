import { chemin } from './chemins'
import { distance, voisines, type Case } from './grille'
import { attirer, avancer, direction, glisser, repousser } from './mouvements'
import { creerPlateau, libre, type Plateau } from './plateau'
import { refusCible } from './portee'
import {
  COMPORTEMENTS, POUPEES, SORTS_SADIDA, dureeInfection, exploite, invocation, sort as trouverSort, type Sort,
} from './sorts'
import { zone } from './zones'

/**
 * Une partie = le T1 du Sadida, puis celui de chacune de ses invocations, de la dernière
 * invoquée à la première (comme en jeu). Tout est immuable : `jouer` renvoie une nouvelle partie,
 * et annuler revient à rejouer la liste des actions sans la dernière (`rejouer`).
 */

export interface Stats {
  pa: number
  pm: number
  /** Bonus de PO, ajouté aux sorts à PO modifiable. */
  po: number
}

/** Caractéristiques du Sadida : fixes, les mêmes pour tous les joueurs. */
export const STATS_DEFAUT: Stats = { pa: 12, pm: 6, po: 6 }
/** Prycipithon Mate : +2 PA au premier tour. */
export const PA_PRYCIPITHON = 2
/** En échange, les points sont réduits de 10 % (les étoiles ne changent pas). */
export const FACTEUR_PRYCIPITHON = 0.9
export const EXPLOITATIONS_MAX = 3
export const SADIDA = 0

export type Genre = 'sadida' | 'ennemi' | 'arbre' | 'invocation'

export interface Entite {
  id: number
  genre: Genre
  nom: string
  case: Case
  /** Id du monstre, pour les Arbres et les invocations. */
  monstre?: number
  /** PA et PM restants. */
  pa: number
  pm: number
  infecte?: boolean
  /** Tours d'Infection restants, comptés en tours de celui qui l'a posée. */
  dureeInfection?: number
  /**
   * L'Infection vient d'une invocation : elle expire au début du tour de l'invocation,
   * qui joue après le Sadida. Une Infection d'un tour posée par La Folle tient donc tout
   * le tour 2 du Sadida ; posée par le Sadida, elle disparaît au début de son tour 2.
   */
  infectionParInvocation?: boolean
  /** État Mandragore (2 tours) : réinfecte la cible, l'infection tient au tour suivant. */
  mandragore?: boolean
  /** Intaclable (Célérité) : peut quitter le contact d'un ennemi. */
  intaclable?: boolean
  feuillu?: boolean
}

export interface Partie {
  cases: string
  /** Caractéristiques de départ du Sadida (PA comptés avec la Prycipithon). */
  stats: Stats
  prycipithon: boolean
  /** Les sorts choisis par le joueur : une variante par paire. */
  sorts: number[]
  entites: Entite[]
  /** Ceux qui jouent, dans l'ordre : le Sadida, puis ses invocations, de la dernière invoquée à la première. */
  ordre: number[]
  /** Position dans `ordre` de celui qui joue ; `ordre.length` quand tout le monde a joué. */
  tour: number
  /** Lancers déjà faits : « acteur:sort » et « acteur:sort:cible ». */
  lancers: Record<string, number>
  exploitations: number
  prochainId: number
}

export type Action =
  | { type: 'deplacement', acteur: number, vers: Case }
  | { type: 'sort', acteur: number, sort: number, cible: Case }
  /** Termine le tour de l'acteur : la main passe à l'invocation suivante. */
  | { type: 'fin', acteur: number }

/** Ce qu'une action a changé, pour la timeline. */
export interface Bilan {
  texte: string[]
  infectes: number[]
  desinfectes: number[]
  /** Ennemis qui ont reçu l'état Mandragore. */
  mandragores: number[]
  /** Celui qui a joué, avec ce qui lui reste après l'action. */
  acteur: { id: number, nom: string, pa: number, pm: number }
}

export type Resultat =
  | { ok: true, partie: Partie, bilan: Bilan }
  | { ok: false, raison: string }

export function nouvellePartie(o: {
  cases: string
  sadida: Case
  ennemis: Case[]
  sorts: number[]
  stats?: Stats
  /** Prycipithon Mate équipée : +2 PA au tour 1, points × 0,9. */
  prycipithon?: boolean
}): Partie {
  const base = o.stats ?? STATS_DEFAUT
  const stats = o.prycipithon ? { ...base, pa: base.pa + PA_PRYCIPITHON } : base
  const paires = new Set<number>()
  for (const id of o.sorts) {
    const s = SORTS_SADIDA.find(s => s.id === id)
    if (!s) throw new Error(`${id} n'est pas un sort du Sadida`)
    if (paires.has(s.paire!)) throw new Error(`${s.nom} : une seule variante par paire`)
    paires.add(s.paire!)
  }
  const entites: Entite[] = [
    { id: SADIDA, genre: 'sadida', nom: 'Sadida', case: o.sadida, pa: stats.pa, pm: stats.pm },
    ...o.ennemis.map((c, k): Entite => ({ id: k + 1, genre: 'ennemi', nom: `Ennemi ${k + 1}`, case: c, pa: 0, pm: 0 })),
  ]
  creerPlateau(o.cases, entites.map(e => e.case)) // vérifie la map
  return {
    cases: o.cases, stats, prycipithon: Boolean(o.prycipithon), sorts: [...o.sorts], entites, ordre: [SADIDA], tour: 0,
    lancers: {}, exploitations: 0, prochainId: entites.length,
  }
}

export function plateau(p: Partie): Plateau {
  return creerPlateau(p.cases, p.entites.map(e => e.case))
}

export function entiteSur(p: Partie, c: Case): Entite | undefined {
  return p.entites.find(e => e.case === c)
}

/**
 * Celui qui a la main : le premier encore en vie dans l'ordre à partir du tour courant
 * (La Sacrifiée qui a explosé passe son tour). Undefined quand tout le monde a joué.
 */
export function acteurCourant(p: Partie): Entite | undefined {
  for (const id of p.ordre.slice(p.tour)) {
    const e = p.entites.find(x => x.id === id)
    if (e) return e
  }
  return undefined
}

export function termine(p: Partie): boolean {
  return acteurCourant(p) === undefined
}

export function jouer(depart: Partie, action: Action): Resultat {
  const p = structuredClone(depart)
  const courant = acteurCourant(p)
  if (!courant) return refus('le tour est terminé')
  if (action.acteur !== courant.id) return refus(`c'est au tour de ${courant.nom}`)
  const acteur = courant
  p.tour = p.ordre.indexOf(acteur.id)
  if (action.type === 'fin') {
    p.tour++
    const suivant = acteurCourant(p)
    const texte = [`Fin du tour de ${acteur.nom}`, suivant ? `au tour de ${suivant.nom}` : 'fin de la salle']
    return { ok: true, partie: p, bilan: { ...bilanVide(), texte, acteur: { id: acteur.id, nom: acteur.nom, pa: acteur.pa, pm: acteur.pm } } }
  }
  const r = action.type === 'deplacement' ? deplacer(p, acteur, action.vers) : lancer(p, acteur, action.sort, action.cible)
  if (r.ok) r.bilan.acteur = { id: acteur.id, nom: acteur.nom, pa: acteur.pa, pm: acteur.pm }
  return r
}

/** Rejoue les actions depuis le départ. S'arrête à la première qui n'est plus possible. */
export function rejouer(depart: Partie, actions: Action[]): {
  partie: Partie
  bilans: Bilan[]
  erreur?: { index: number, raison: string }
} {
  let partie = depart
  const bilans: Bilan[] = []
  for (const [index, a] of actions.entries()) {
    const r = jouer(partie, a)
    if (!r.ok) return { partie, bilans, erreur: { index, raison: r.raison } }
    partie = r.partie
    bilans.push(r.bilan)
  }
  return { partie, bilans }
}

export const POINTS_PAR_PA = 10
/** Bonus de la 4e étoile : tous les ennemis encore infectés au tour 2. */
export const POINTS_TOUR_2 = 50

/**
 * Moment où l'Infection expire, en demi-tours : 2 × d au début du tour d+1 du Sadida,
 * 2 × d + 1 au début de celui d'une invocation (qui joue après lui).
 */
function finInfection(e: Entite): number {
  return 2 * (e.dureeInfection ?? 0) + (e.infectionParInvocation ? 1 : 0)
}

/**
 * L'ennemi sera encore infecté pendant le tour 2 du Sadida : son Infection expire après le
 * début de ce tour (2 tours posés par le Sadida, 1 par une invocation), ou il est sous Mandragore.
 */
export function infecteAuTour2(e: Entite): boolean {
  return Boolean(e.infecte && (finInfection(e) > 2 || e.mandragore))
}

export interface Score {
  infectes: number
  total: number
  part: number
  /** 4 : tous encore infectés au tour 2. */
  etoiles: 0 | 1 | 2 | 3 | 4
  /** Ennemis encore infectés au tour 2. */
  auTour2: number
  /** PA du Sadida dépensés et restants (les invocations ont leurs propres PA). */
  paDepenses: number
  paRestants: number
  /**
   * 100 × la part d'ennemis infectés, plus POINTS_PAR_PA par PA du Sadida non dépensé
   * si tous sont infectés : moins on dépense, mieux c'est. Plus POINTS_TOUR_2 avec la 4e étoile.
   */
  points: number
}

export function score(p: Partie): Score {
  const ennemis = p.entites.filter(e => e.genre === 'ennemi')
  const infectes = ennemis.filter(e => e.infecte).length
  const part = ennemis.length ? infectes / ennemis.length : 0
  const paRestants = p.entites.find(e => e.id === SADIDA)?.pa ?? 0
  const auTour2 = ennemis.filter(infecteAuTour2).length
  const fixee = part === 1 && auTour2 === ennemis.length
  return {
    infectes,
    total: ennemis.length,
    part,
    etoiles: fixee ? 4 : part === 1 ? 3 : part >= 0.75 ? 2 : part >= 0.5 ? 1 : 0,
    auTour2,
    paDepenses: p.stats.pa - paRestants,
    paRestants,
    points: Math.round((Math.round(100 * part) + (part === 1 ? POINTS_PAR_PA * paRestants : 0) + (fixee ? POINTS_TOUR_2 : 0))
      * (p.prycipithon ? FACTEUR_PRYCIPITHON : 1)),
  }
}

/**
 * Ce que le sort exige de sa cible en plus de la portée (une entité précise), ou null.
 * Sert aussi à n'afficher comme visables que les cases qui conviennent.
 */
export function refusCibleSpecifique(p: Partie, acteur: Entite, sortId: number, cible: Case): string | null {
  const comp = COMPORTEMENTS[sortId]
  const visee = entiteSur(p, cible)
  switch (comp?.type) {
    case 'remplace-arbre':
      if (visee?.genre !== 'arbre') return 'il faut viser un Arbre'
      if (comp.feuilluRequis && !visee.feuillu) return 'il faut viser un Arbre Feuillu'
      return null
    case 'explosion':
      // La Sacrifiée explose sur elle-même, à condition d'avoir un ennemi au contact
      if (!p.entites.some(e => e.genre === 'ennemi' && distance(e.case, acteur.case) === 1)) return 'aucun ennemi au contact'
      if (cible !== acteur.case) return `${acteur.nom} explose sur sa propre case`
      return null
    case 'echange':
      if (!visee || visee.id === acteur.id || visee.genre === 'ennemi') return 'il faut viser un allié'
      return null
    case 'gain-pm':
      if (!comp.soi && !visee) return 'il faut viser une entité'
      return null
    case 'attire-centre':
      if (visee?.id === acteur.id || (visee?.genre === 'arbre' && visee.feuillu) || POUPEES.has(visee?.monstre!)) return null
      return 'il faut viser le lanceur, un Arbre Feuillu ou une Poupée'
    default:
      return null
  }
}

function refus(raison: string): Resultat {
  return { ok: false, raison }
}

/** L'acteur est rempli par `jouer` une fois l'action faite. */
function bilanVide(): Bilan {
  return { texte: [], infectes: [], desinfectes: [], mandragores: [], acteur: { id: -1, nom: '', pa: 0, pm: 0 } }
}

/**
 * Tacle, simplifié : on se fait toujours tacler. Au contact d'un ennemi, on ne peut plus
 * repartir (pas de perte de PA ni de PM simulée). Renvoie les cases d'où l'on ne repart pas.
 */
export function arretTacle(p: Partie, acteur: Entite): (c: Case) => boolean {
  if (acteur.intaclable) return () => false
  const ennemis = new Set(p.entites.filter(e => e.genre === 'ennemi').map(e => e.case))
  return c => voisines(c).some(v => ennemis.has(v))
}

function deplacer(p: Partie, acteur: Entite, vers: Case): Resultat {
  if (acteur.genre !== 'sadida' && acteur.genre !== 'invocation') return refus(`${acteur.nom} ne se déplace pas`)
  if (vers === acteur.case) return refus('déjà sur cette case')
  const arret = arretTacle(p, acteur)
  if (arret(acteur.case)) return refus(`${acteur.nom} est taclé : impossible de quitter le contact d'un ennemi`)
  const ch = chemin(plateau(p), acteur.case, vers, acteur.pm, arret)
  if (!ch) return refus(`case hors d'atteinte avec ${acteur.pm} PM`)
  acteur.case = vers
  acteur.pm -= ch.length
  return { ok: true, partie: p, bilan: { ...bilanVide(), texte: [`${acteur.nom} → case ${vers} (${ch.length} PM)`] } }
}

function lancer(p: Partie, acteur: Entite, id: number, cible: Case): Resultat {
  let s: Sort
  try {
    s = trouverSort(id)
  } catch {
    return refus('sort inconnu')
  }
  if (acteur.genre === 'sadida' ? !p.sorts.includes(id)
    : acteur.genre !== 'invocation' || !invocation(acteur.monstre!).sorts.some(x => x.id === id)) {
    return refus(`${acteur.nom} n'a pas ${s.nom}`)
  }
  if (s.relance_initiale) return refus(`${s.nom} ne se lance pas au tour 1`)
  if (acteur.pa < s.pa) return refus(`PA insuffisants (${acteur.pa} / ${s.pa})`)
  const cleTour = `${acteur.id}:${id}`
  if (s.lancers_par_tour && (p.lancers[cleTour] ?? 0) >= s.lancers_par_tour) {
    return refus(`${s.nom} : déjà lancé ${s.lancers_par_tour} fois ce tour`)
  }
  const raison = refusCible(plateau(p), acteur.case, cible, s, acteur.genre === 'sadida' ? p.stats.po : 0)
  if (raison) return refus(raison)
  const visee = entiteSur(p, cible)
  const cleCible = visee && `${cleTour}:${visee.id}`
  if (cleCible && s.lancers_par_cible && (p.lancers[cleCible] ?? 0) >= s.lancers_par_cible) {
    return refus(`${s.nom} : déjà lancé ${s.lancers_par_cible} fois sur ${visee.nom}`)
  }

  const comp = COMPORTEMENTS[id]
  const specifique = refusCibleSpecifique(p, acteur, id, cible)
  if (specifique) return refus(specifique)

  acteur.pa -= s.pa
  p.lancers[cleTour] = (p.lancers[cleTour] ?? 0) + 1
  if (cleCible) p.lancers[cleCible] = (p.lancers[cleCible] ?? 0) + 1

  const bilan: Bilan = { ...bilanVide(), texte: [`${acteur.nom} : ${s.nom} → ${visee ? visee.nom : `case ${cible}`}`] }
  const dire = (t: string) => bilan.texte.push(t)
  const duree = dureeInfection(s)
  const parInvocation = acteur.genre === 'invocation'
  /** Pose une Infection de `d` tours si elle dure plus longtemps que celle en place. */
  const prolonger = (e: Entite, d: number): boolean => {
    const nouvelle = { ...e, dureeInfection: d, infectionParInvocation: parInvocation }
    if (e.infecte && finInfection(nouvelle) <= finInfection(e)) return false
    e.dureeInfection = d
    e.infectionParInvocation = parInvocation
    return true
  }
  /** Infecte (ou prolonge) les ennemis sur ces cases. */
  const infecter = (cases: Case[]) => {
    for (const e of p.entites) {
      if (e.genre !== 'ennemi' || !cases.includes(e.case)) continue
      const nouveau = !e.infecte
      prolonger(e, duree)
      if (nouveau) {
        e.infecte = true
        bilan.infectes.push(e.id)
      }
    }
  }
  const infectes = () => p.entites.filter(e => e.genre === 'ennemi' && e.infecte)
  const invoquer = (monstre: number, c: Case) => {
    const m = invocation(monstre)
    const e: Entite = { id: p.prochainId++, genre: 'invocation', nom: m.nom, case: c, monstre, pa: m.pa, pm: m.pm }
    p.entites.push(e)
    // Comme en jeu, la dernière invoquée joue la première : elle passe juste après celui qui joue
    p.ordre.splice(p.tour + 1, 0, e.id)
    dire(`${m.nom} invoquée en case ${c}`)
  }
  const retirer = (e: Entite) => {
    p.entites = p.entites.filter(x => x.id !== e.id)
  }
  const estLibre = (c: Case) => libre(plateau(p), c)
  const deplacerDe = (e: Entite, vers: Case, verbe: string) => {
    if (vers === e.case) {
      dire(`${e.nom} ne bouge pas`)
      return
    }
    dire(`${e.nom} : ${verbe} de ${distance(e.case, vers)} case${distance(e.case, vers) > 1 ? 's' : ''} (case ${e.case} → ${vers})`)
    e.case = vers
  }

  // L'exploitation se décide avant les effets : la cible doit déjà être Infectée.
  let exploitee = false
  if (exploite(s) && visee?.genre === 'ennemi' && visee.infecte) {
    if (p.exploitations < EXPLOITATIONS_MAX) {
      p.exploitations++
      exploitee = true
      dire(`exploite l'Infection (${p.exploitations} / ${EXPLOITATIONS_MAX}) : touche tous les Infectés`)
    } else {
      dire(`pas d'exploitation : déjà ${EXPLOITATIONS_MAX} ce tour`)
    }
  }

  switch (comp?.type) {
    case 'arbre':
      p.entites.push({ id: p.prochainId++, genre: 'arbre', nom: comp.feuillu ? 'Arbre Feuillu' : 'Arbre', case: cible, monstre: 5894, pa: 0, pm: 0, feuillu: comp.feuillu })
      dire(`${comp.feuillu ? 'Arbre Feuillu' : 'Arbre'} planté en case ${cible}`)
      if (comp.toutFeuillu) rendreFeuillus(p.entites.filter(e => e.genre === 'arbre'), dire)
      break
    case 'invoque':
      invoquer(comp.monstre, cible)
      break
    case 'remplace-arbre':
      retirer(visee!)
      invoquer(comp.monstre, cible)
      break
    case 'infecte':
      if (visee?.genre === 'ennemi') infecter([cible])
      else if (comp.zoneFeuillu && visee?.genre === 'arbre' && visee.feuillu) infecter(zone(cible, 'cercle', comp.zoneFeuillu))
      if (comp.mandragore && visee?.genre === 'ennemi') {
        // Sur un Infecté (avec exploitation), les effets touchent tous les Infectés
        const touches = exploitee ? infectes() : [visee]
        for (const e of touches) {
          if (e.mandragore) continue
          e.mandragore = true
          bilan.mandragores.push(e.id)
        }
      }
      break
    case 'maintient': {
      // Cigüe : la cible Infectée, ou les Infectés autour d'un Arbre Feuillu
      const touches = visee?.genre === 'ennemi' && visee.infecte ? [visee]
        : visee?.genre === 'arbre' && visee.feuillu ? infectes().filter(e => distance(e.case, cible) <= comp.zoneFeuillu)
          : []
      for (const e of touches) {
        if (!prolonger(e, comp.duree)) continue
        dire(`${e.nom} : Infection maintenue ${comp.duree} tours`)
      }
      if (!touches.length) dire("pas de maintien : ni ennemi Infecté, ni Infecté autour d'un Arbre Feuillu")
      break
    }
    case 'reduit': {
      const touches = exploitee ? infectes() : visee?.genre === 'ennemi' && visee.infecte ? [visee] : []
      for (const e of touches) {
        e.dureeInfection = Math.max(0, (e.dureeInfection ?? 1) - comp.tours)
        if (e.dureeInfection > 0) {
          dire(`${e.nom} : Infection réduite à ${e.dureeInfection} tour${e.dureeInfection > 1 ? 's' : ''}`)
          continue
        }
        e.infecte = false
        bilan.desinfectes.push(e.id)
      }
      break
    }
    case 'propage':
      if (visee?.genre === 'ennemi' && visee.infecte) infecter(zone(cible, 'cercle', comp.rayon))
      else dire("pas de propagation : la cible n'est pas un ennemi Infecté")
      break
    case 'miasmes': {
      const centres = [acteur, ...p.entites.filter(e => (e.genre === 'arbre' && e.feuillu) || POUPEES.has(e.monstre!))]
      infecter(centres.flatMap(e => zone(e.case, 'cercle', comp.rayon)))
      break
    }
    case 'sacrifie-poupee':
      if (visee && POUPEES.has(visee.monstre!)) {
        retirer(visee)
        dire(`${visee.nom} est sacrifiée`)
        infecter(zone(cible, 'cercle', comp.rayon))
      }
      break
    case 'feuillu': {
      const arbres = p.entites.filter(e => e.genre === 'arbre')
      rendreFeuillus(comp.forme === 'tous' ? arbres : arbres.filter(a => zone(cible, 'carre', comp.rayon).includes(a.case)), dire)
      break
    }
    case 'desinfecte':
      if (visee?.genre === 'ennemi' && visee.infecte) {
        for (const e of p.entites) {
          if (e.genre === 'ennemi' && e.infecte) {
            e.infecte = false
            e.dureeInfection = 0
            e.infectionParInvocation = false
            bilan.desinfectes.push(e.id)
          }
        }
      }
      break
    case 'explosion':
      infecter(zone(cible, 'cercle', comp.rayon))
      retirer(acteur)
      dire(`${acteur.nom} explose`)
      break
    case 'attire-centre': {
      // Les plus proches du centre bougent d'abord, pour laisser la place aux autres.
      const touches = p.entites
        .filter(e => e.genre !== 'arbre' && distance(e.case, cible) > 1 && distance(e.case, cible) <= comp.rayon)
        .sort((a, b) => distance(a.case, cible) - distance(b.case, cible))
      for (const e of touches) deplacerDe(e, attirer(e.case, cible, comp.distance, estLibre), 'attirance')
      break
    }
    case 'pousse-jusqua': {
      const dir = direction(acteur.case, cible)!
      let c: Case | null = acteur.case
      let touche: Entite | undefined
      while (!touche && c !== cible && (c = avancer(c, dir)) !== null) touche = entiteSur(p, c)
      if (!touche) break
      if (touche.genre === 'ennemi') infecter([touche.case])
      if (touche.case !== cible) deplacerDe(touche, glisser(touche.case, dir, distance(touche.case, cible), estLibre), 'poussée')
      break
    }
    case 'attire-jusqua': {
      const dir = direction(acteur.case, cible)!
      let c: Case | null = cible
      let touche = entiteSur(p, cible)
      for (let k = 0; !touche && k < comp.portee && (c = avancer(c!, dir)) !== null; k++) touche = entiteSur(p, c)
      if (!touche) break
      if (touche.genre === 'ennemi') infecter([touche.case])
      if (touche.case !== cible) {
        const retour: [number, number] = [-dir[0], -dir[1]]
        deplacerDe(touche, glisser(touche.case, retour, distance(touche.case, cible), estLibre), 'attirance')
      }
      break
    }
    case 'repousse-autour':
      for (const e of p.entites.filter(e => e.genre !== 'arbre' && e.id !== acteur.id && zone(acteur.case, 'croix_diag', 1).includes(e.case))) {
        deplacerDe(e, repousser(e.case, acteur.case, comp.distance, estLibre), 'recul')
      }
      break
    case 'echange': {
      const allie = visee!
      const depart = acteur.case
      dire(`${acteur.nom} échange de place avec ${allie.nom} : case ${depart} ↔ ${allie.case}`)
      acteur.case = allie.case
      allie.case = depart
      break
    }
    case 'gain-pm': {
      const e = comp.soi ? acteur : visee!
      e.pm += comp.pm
      dire(`${e.nom} : +${comp.pm} PM (${e.pm} PM)`)
      if (comp.intaclable) {
        e.intaclable = true
        dire(`${e.nom} est Intaclable`)
      }
      break
    }
    case 'non-simule':
      dire(`effet non simulé : ${comp.effet}`)
      break
  }

  for (const id of bilan.infectes) dire(`${nom(p, id)} est Infecté`)
  for (const id of bilan.desinfectes) dire(`${nom(p, id)} n'est plus Infecté`)
  if (bilan.mandragores.length) dire(`Mandragore sur ${bilan.mandragores.map(id => nom(p, id)).join(', ')}`)
  if (bilan.texte.length === 1) dire("aucun effet sur l'infection")
  return { ok: true, partie: p, bilan }
}

function rendreFeuillus(arbres: Entite[], dire: (t: string) => void) {
  for (const a of arbres) {
    if (a.feuillu) continue
    a.feuillu = true
    a.nom = 'Arbre Feuillu'
    dire(`l'Arbre en case ${a.case} devient Feuillu`)
  }
}

function nom(p: Partie, id: number): string {
  return p.entites.find(e => e.id === id)?.nom ?? `#${id}`
}
