import { cheminVers, deplacements } from './chemins'
import { distance, voisines, type Case } from './grille'
import { attirer, avancer, direction, glisser, repousser } from './mouvements'
import { creerPlateau, libre, type Plateau } from './plateau'
import { refusCible } from './portee'
import {
  COMPORTEMENTS, INTACLABLES, NIVEAU_MAX, POUPEES, SORTS_SADIDA, dureeInfection, exploite, invocation, niveauRequis, sort as trouverSort, sortAuNiveau, type Sort,
} from './sorts'
import { msg, type Message, type RefEntite } from './messages'
import { zone } from './zones'
import { fuiteInvocation, partGardee, perte } from './tacle'

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
  /** Invocations en jeu en même temps au plus (les Arbres ne comptent pas, comme en jeu). */
  invo: number
  /** Fuite : limite les PM et les PA perdus en quittant le contact d'un ennemi (voir tacle.ts). */
  fuite: number
}

/** Caractéristiques du Sadida : fixes, les mêmes pour tous les joueurs. */
export const STATS_DEFAUT: Stats = { pa: 12, pm: 6, po: 6, invo: 4, fuite: 80 }
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
  /** Intaclable (Célérité, Harmonie) : ne perd rien en quittant le contact d'un ennemi. */
  intaclable?: boolean
  /** Fuite du Sadida et des invocations. */
  fuite?: number
  /** Tacle des ennemis. */
  tacle?: number
  feuillu?: boolean
}

export interface Partie {
  cases: string
  /** Caractéristiques de départ du Sadida (PA comptés avec la Prycipithon). */
  stats: Stats
  prycipithon: boolean
  /** Niveau du Sadida : il donne les sorts débloqués et leur rang (PO). */
  niveau: number
  /** Les sorts choisis par le joueur : une variante par paire, débloquée au niveau. */
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
  /**
   * Celui qui a la main et vient de mourir pendant son tour (La Sacrifiée qui explose) :
   * il garde la main, sans PA ni PM, jusqu'à « Fin du tour ».
   */
  mort?: Entite
}

export type Action =
  | { type: 'deplacement', acteur: number, vers: Case }
  | { type: 'sort', acteur: number, sort: number, cible: Case }
  /** Termine le tour de l'acteur : la main passe à l'invocation suivante. */
  | { type: 'fin', acteur: number }

/** Ce qu'une action a changé, pour la timeline. */
export interface Bilan {
  /** Le titre de l'action, puis son détail (messages à traduire, voir messages.ts). */
  texte: Message[]
  infectes: number[]
  desinfectes: number[]
  /** Ennemis qui ont reçu l'état Mandragore. */
  mandragores: number[]
  /** Celui qui a joué, avec ce qui lui reste après l'action. */
  acteur: RefEntite & { pa: number, pm: number }
}

export type Resultat =
  | { ok: true, partie: Partie, bilan: Bilan }
  | { ok: false, raison: Message }

export function nouvellePartie(o: {
  cases: string
  sadida: Case
  ennemis: Case[]
  sorts: number[]
  stats?: Partial<Stats>
  /** Prycipithon Mate équipée : +2 PA au tour 1, points × 0,9. */
  prycipithon?: boolean
  /** Niveau du Sadida (200 par défaut). */
  niveau?: number
  /** Tacle de chaque ennemi, dans l'ordre de `ennemis` (0 par défaut). */
  tacles?: number[]
}): Partie {
  const niveau = o.niveau ?? NIVEAU_MAX
  const base: Stats = { ...STATS_DEFAUT, ...o.stats }
  const stats = o.prycipithon ? { ...base, pa: base.pa + PA_PRYCIPITHON } : base
  const paires = new Set<number>()
  for (const id of o.sorts) {
    const s = SORTS_SADIDA.find(s => s.id === id)
    if (!s) throw new Error(`${id} n'est pas un sort du Sadida`)
    if (paires.has(s.paire!)) throw new Error(`${s.nom} : une seule variante par paire`)
    if (niveauRequis(s) > niveau) throw new Error(`${s.nom} : pas débloqué au niveau ${niveau}`)
    paires.add(s.paire!)
  }
  const entites: Entite[] = [
    { id: SADIDA, genre: 'sadida', nom: 'Sadida', case: o.sadida, pa: stats.pa, pm: stats.pm, fuite: stats.fuite },
    ...o.ennemis.map((c, k): Entite => ({ id: k + 1, genre: 'ennemi', nom: `Ennemi ${k + 1}`, case: c, pa: 0, pm: 0, tacle: o.tacles?.[k] ?? 0 })),
  ]
  creerPlateau(o.cases, entites.map(e => e.case)) // vérifie la map
  return {
    cases: o.cases, stats, prycipithon: Boolean(o.prycipithon), niveau, sorts: [...o.sorts], entites, ordre: [SADIDA], tour: 0,
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
 * Celui qui a la main : le premier encore en vie dans l'ordre à partir du tour courant (une
 * Poupée sacrifiée avant son tour le passe), ou celui qui est mort pendant son propre tour,
 * jusqu'à ce qu'il le termine. Undefined quand tout le monde a joué.
 */
export function acteurCourant(p: Partie): Entite | undefined {
  if (p.mort && p.ordre[p.tour] === p.mort.id) return p.mort
  for (const id of p.ordre.slice(p.tour)) {
    const e = p.entites.find(x => x.id === id)
    if (e) return e
  }
  return undefined
}

/** Les invocations en vie (Poupées, Groute, Tréant) : les Arbres ne comptent pas dans la limite. */
export function invocationsEnJeu(p: Partie): number {
  return p.entites.filter(e => e.genre === 'invocation').length
}

export function termine(p: Partie): boolean {
  return acteurCourant(p) === undefined
}

export function jouer(depart: Partie, action: Action): Resultat {
  const p = structuredClone(depart)
  const courant = acteurCourant(p)
  if (!courant) return refus(msg('tour-termine'))
  if (action.acteur !== courant.id) return refus(msg('tour-de', { e: ref(courant) }))
  const acteur = courant
  p.tour = p.ordre.indexOf(acteur.id)
  if (action.type === 'fin') {
    p.tour++
    delete p.mort
    const suivant = acteurCourant(p)
    const texte = [msg('titre-fin', { e: ref(acteur) }), suivant ? msg('au-tour-de', { e: ref(suivant) }) : msg('fin-salle')]
    return { ok: true, partie: p, bilan: { ...bilanVide(), texte, acteur: { ...ref(acteur), pa: acteur.pa, pm: acteur.pm } } }
  }
  if (p.mort?.id === acteur.id) return refus(msg('acteur-mort', { e: ref(acteur) }))
  const r = action.type === 'deplacement' ? deplacer(p, acteur, action.vers) : lancer(p, acteur, action.sort, action.cible)
  // Mort pendant l'action (La Sacrifiée) : plus de PA ni de PM
  const apres = p.mort?.id === acteur.id ? p.mort : acteur
  if (r.ok) r.bilan.acteur = { ...ref(acteur), pa: apres.pa, pm: apres.pm }
  return r
}

/** Rejoue les actions depuis le départ. S'arrête à la première qui n'est plus possible. */
export function rejouer(depart: Partie, actions: Action[]): {
  partie: Partie
  bilans: Bilan[]
  erreur?: { index: number, raison: Message }
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
/**
 * Version des règles du moteur et du score. À monter à chaque changement qui modifie le
 * résultat d'un même tour (sort revu, calcul des points…) : les records d'avant ne servent
 * plus de référence. 2 : La Sacrifiée et la Prycipithon revues, limite d'invocations (2026-11-15).
 */
export const VERSION_REGLES = 6
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
  /** PA restants qui rapportent des points : ceux de la Prycipithon Mate n'en rapportent pas. */
  paComptes: number
  /**
   * 100 × la part d'ennemis infectés, plus POINTS_PAR_PA par PA du Sadida non dépensé (hors
   * Prycipithon) si tous sont infectés : moins on dépense, mieux c'est. Plus POINTS_TOUR_2 avec
   * la 4e étoile. × FACTEUR_PRYCIPITHON avec la Prycipithon : l'activer sans en avoir besoin
   * est toujours perdant.
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
  const paComptes = Math.max(0, paRestants - (p.prycipithon ? PA_PRYCIPITHON : 0))
  return {
    infectes,
    total: ennemis.length,
    part,
    etoiles: fixee ? 4 : part === 1 ? 3 : part >= 0.75 ? 2 : part >= 0.5 ? 1 : 0,
    auTour2,
    paDepenses: p.stats.pa - paRestants,
    paRestants,
    paComptes,
    points: Math.round((Math.round(100 * part) + (part === 1 ? POINTS_PAR_PA * paComptes : 0) + (fixee ? POINTS_TOUR_2 : 0))
      * (p.prycipithon ? FACTEUR_PRYCIPITHON : 1)),
  }
}

/**
 * Ce que le sort exige de sa cible en plus de la portée (une entité précise), ou null.
 * Sert aussi à n'afficher comme visables que les cases qui conviennent.
 */
export function refusCibleSpecifique(p: Partie, acteur: Entite, sortId: number, cible: Case): Message | null {
  const comp = COMPORTEMENTS[sortId]
  const visee = entiteSur(p, cible)
  switch (comp?.type) {
    case 'remplace-arbre':
      if (visee?.genre !== 'arbre') return msg('viser-arbre')
      if (comp.feuilluRequis && !visee.feuillu) return msg('viser-arbre-feuillu')
      return null
    case 'explosion':
      // La Sacrifiée se déclenche en visant une entité à son contact (alliée ou ennemie) ;
      // l'explosion reste centrée sur elle
      if (!visee || visee.id === acteur.id || distance(cible, acteur.case) !== 1) return msg('viser-entite-contact')
      return null
    case 'echange':
      if (!visee || visee.id === acteur.id || visee.genre === 'ennemi') return msg('viser-allie')
      return null
    case 'gain-pm':
      if (!comp.soi && !visee) return msg('viser-entite')
      return null
    case 'attire-centre':
      if (visee?.id === acteur.id || (visee?.genre === 'arbre' && visee.feuillu) || POUPEES.has(visee?.monstre!)) return null
      return msg('viser-centre-tremblement')
    default:
      return null
  }
}

/** La référence d'une entité, pour la nommer dans un message. */
export function ref(e: Entite): RefEntite {
  return { id: e.id, genre: e.genre, ...(e.monstre !== undefined && { monstre: e.monstre }), ...(e.feuillu && { feuillu: true }) }
}

function refus(raison: Message): Resultat {
  return { ok: false, raison }
}

/** L'acteur est rempli par `jouer` une fois l'action faite. */
function bilanVide(): Bilan {
  return { texte: [], infectes: [], desinfectes: [], mandragores: [], acteur: { id: -1, genre: 'sadida', pa: 0, pm: 0 } }
}

/**
 * Tacle (voir tacle.ts) : part des PM et des PA que l'acteur garde en quittant chaque case,
 * selon sa Fuite et le Tacle des ennemis au contact. La Groute et le Tréant sont Intaclables
 * d'office ; La Bloqueuse le devient avec Célérité, le Sadida avec Harmonie.
 */
export function gardeTacle(p: Partie, acteur: Entite): (c: Case) => number {
  if (acteur.intaclable || INTACLABLES.has(acteur.monstre!)) return () => 1
  const tacleSur = new Map(p.entites.filter(e => e.genre === 'ennemi').map(e => [e.case, e.tacle ?? 0]))
  return c => partGardee(acteur.fuite ?? 0, voisines(c).filter(v => tacleSur.has(v)).map(v => tacleSur.get(v)!))
}

/** Où l'acteur peut aller : PM et PA restants à l'arrivée, tacle compris. */
export function deplacementsDe(p: Partie, acteur: Entite) {
  return deplacements(plateau(p), acteur.case, acteur.pm, acteur.pa, gardeTacle(p, acteur))
}

function deplacer(p: Partie, acteur: Entite, vers: Case): Resultat {
  if (acteur.genre !== 'sadida' && acteur.genre !== 'invocation') return refus(msg('ne-se-deplace-pas', { e: ref(acteur) }))
  if (vers === acteur.case) return refus(msg('deja-sur-case'))
  const arrivees = deplacementsDe(p, acteur)
  const arrivee = arrivees.get(vers)
  if (!arrivee) return refus(msg('hors-atteinte', { pm: acteur.pm }))
  const longueur = cheminVers(arrivees, vers)!.length
  const pmPerdus = acteur.pm - arrivee.pm - longueur
  const paPerdus = acteur.pa - arrivee.pa
  acteur.case = vers
  acteur.pm = arrivee.pm
  acteur.pa = arrivee.pa
  const texte = [msg('titre-deplacement', { case: vers, pm: longueur })]
  if (pmPerdus || paPerdus) texte.push(msg('tacle-perte', { e: ref(acteur), pm: pmPerdus, pa: paPerdus }))
  return { ok: true, partie: p, bilan: { ...bilanVide(), texte } }
}

/** Le sort tel que le lance la partie : au rang du niveau du Sadida (null s'il n'est pas débloqué). */
export function sortDe(p: Partie, id: number): Sort | null {
  return sortAuNiveau(trouverSort(id), p.niveau)
}

function lancer(p: Partie, acteur: Entite, id: number, cible: Case): Resultat {
  let s: Sort | null
  try {
    s = sortDe(p, id)
  } catch {
    return refus(msg('sort-inconnu'))
  }
  if (!s) return refus(msg('niveau-requis', { sort: id, niveau: niveauRequis(trouverSort(id)) }))
  if (acteur.genre === 'sadida' ? !p.sorts.includes(id)
    : acteur.genre !== 'invocation' || !invocation(acteur.monstre!).sorts.some(x => x.id === id)) {
    return refus(msg('sort-absent', { e: ref(acteur), sort: id }))
  }
  if (s.relance_initiale) return refus(msg('relance-initiale', { sort: id }))
  if (acteur.pa < s.pa) return refus(msg('pa-insuffisants', { pa: acteur.pa, cout: s.pa }))
  const cleTour = `${acteur.id}:${id}`
  if (s.lancers_par_tour && (p.lancers[cleTour] ?? 0) >= s.lancers_par_tour) {
    return refus(msg('lancers-par-tour', { sort: id, n: s.lancers_par_tour }))
  }
  const raison = refusCible(plateau(p), acteur.case, cible, s, acteur.genre === 'sadida' ? p.stats.po : 0)
  if (raison) return refus(msg(raison))
  const visee = entiteSur(p, cible)
  const cleCible = visee && `${cleTour}:${visee.id}`
  if (cleCible && s.lancers_par_cible && (p.lancers[cleCible] ?? 0) >= s.lancers_par_cible) {
    return refus(msg('lancers-par-cible', { sort: id, n: s.lancers_par_cible, e: ref(visee) }))
  }

  const comp = COMPORTEMENTS[id]
  const specifique = refusCibleSpecifique(p, acteur, id, cible)
  if (specifique) return refus(specifique)
  if ((comp?.type === 'invoque' || comp?.type === 'remplace-arbre') && invocationsEnJeu(p) >= p.stats.invo) {
    return refus(msg('limite-invocations', { n: p.stats.invo }))
  }

  acteur.pa -= s.pa
  p.lancers[cleTour] = (p.lancers[cleTour] ?? 0) + 1
  if (cleCible) p.lancers[cleCible] = (p.lancers[cleCible] ?? 0) + 1

  const bilan: Bilan = { ...bilanVide(), texte: [visee ? msg('titre-sort-entite', { sort: id, e: ref(visee) }) : msg('titre-sort-case', { sort: id, case: cible })] }
  const dire = (m: Message) => bilan.texte.push(m)
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
    const e: Entite = { id: p.prochainId++, genre: 'invocation', nom: m.nom, case: c, monstre, pa: m.pa, pm: m.pm, fuite: fuiteInvocation(monstre) }
    p.entites.push(e)
    // Comme en jeu, la dernière invoquée joue la première : elle passe juste après celui qui joue
    p.ordre.splice(p.tour + 1, 0, e.id)
    dire(msg('invoquee', { e: ref(e), case: c }))
  }
  const retirer = (e: Entite) => {
    p.entites = p.entites.filter(x => x.id !== e.id)
  }
  const estLibre = (c: Case) => libre(plateau(p), c)
  const deplacerDe = (e: Entite, vers: Case, verbe: 'attirance' | 'poussee' | 'recul') => {
    if (vers === e.case) {
      dire(msg('ne-bouge-pas', { e: ref(e) }))
      return
    }
    dire(msg(verbe, { e: ref(e), n: distance(e.case, vers), de: e.case, vers }))
    e.case = vers
  }

  // L'exploitation se décide avant les effets : la cible doit déjà être Infectée.
  let exploitee = false
  if (exploite(s) && visee?.genre === 'ennemi' && visee.infecte) {
    if (p.exploitations < EXPLOITATIONS_MAX) {
      p.exploitations++
      exploitee = true
      dire(msg('exploite', { n: p.exploitations, max: EXPLOITATIONS_MAX }))
    } else {
      dire(msg('pas-exploitation', { max: EXPLOITATIONS_MAX }))
    }
  }

  switch (comp?.type) {
    case 'arbre':
      p.entites.push({ id: p.prochainId++, genre: 'arbre', nom: comp.feuillu ? 'Arbre Feuillu' : 'Arbre', case: cible, monstre: 5894, pa: 0, pm: 0, feuillu: comp.feuillu })
      dire(msg(comp.feuillu ? 'arbre-feuillu-plante' : 'arbre-plante', { case: cible }))
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
        dire(msg('infection-maintenue', { e: ref(e), n: comp.duree }))
      }
      if (!touches.length) dire(msg('pas-de-maintien'))
      break
    }
    case 'reduit': {
      const touches = exploitee ? infectes() : visee?.genre === 'ennemi' && visee.infecte ? [visee] : []
      for (const e of touches) {
        e.dureeInfection = Math.max(0, (e.dureeInfection ?? 1) - comp.tours)
        if (e.dureeInfection > 0) {
          dire(msg('infection-reduite', { e: ref(e), n: e.dureeInfection }))
          continue
        }
        e.infecte = false
        bilan.desinfectes.push(e.id)
      }
      break
    }
    case 'propage':
      // Autour de la cible seulement : l'Infection de la cible elle-même garde sa durée
      if (visee?.genre === 'ennemi' && visee.infecte) infecter(zone(cible, 'cercle', comp.rayon).filter(c => c !== cible))
      else dire(msg('pas-de-propagation'))
      break
    case 'miasmes': {
      const centres = [acteur, ...p.entites.filter(e => (e.genre === 'arbre' && e.feuillu) || POUPEES.has(e.monstre!))]
      infecter(centres.flatMap(e => zone(e.case, 'cercle', comp.rayon)))
      break
    }
    case 'sacrifie-poupee':
      if (visee && POUPEES.has(visee.monstre!)) {
        retirer(visee)
        dire(msg('poupee-sacrifiee', { e: ref(visee) }))
        infecter(zone(cible, 'cercle', comp.rayon))
        // « Réinitialise son temps de relance » : le sort qui invoque cette Poupée se relance ce tour-ci
        for (const [id, c] of Object.entries(COMPORTEMENTS)) {
          if ((c.type !== 'invoque' && c.type !== 'remplace-arbre') || c.monstre !== visee.monstre) continue
          for (const cle of Object.keys(p.lancers)) {
            if (cle === `${acteur.id}:${id}` || cle.startsWith(`${acteur.id}:${id}:`)) delete p.lancers[cle]
          }
        }
        dire(msg('relance-reinitialisee', { e: ref(visee) }))
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
      infecter(zone(acteur.case, 'cercle', comp.rayon))
      retirer(acteur)
      // Elle garde la main jusqu'à « Fin du tour », sans rien pouvoir faire
      p.mort = { ...acteur, pa: 0, pm: 0 }
      dire(msg('explose', { e: ref(acteur) }))
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
      if (touche.case !== cible) deplacerDe(touche, glisser(touche.case, dir, distance(touche.case, cible), estLibre), 'poussee')
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
      dire(msg('echange', { e: ref(acteur), autre: ref(allie), de: depart, vers: allie.case }))
      acteur.case = allie.case
      allie.case = depart
      break
    }
    case 'gain-pm': {
      const e = comp.soi ? acteur : visee!
      e.pm += comp.pm
      dire(msg('gain-pm', { e: ref(e), n: comp.pm, total: e.pm }))
      if (comp.intaclable) {
        e.intaclable = true
        dire(msg('intaclable', { e: ref(e) }))
      }
      break
    }
    case 'intaclable':
      acteur.intaclable = true
      dire(msg('intaclable', { e: ref(acteur) }))
      break
    case 'non-simule':
      dire(msg('non-simule', { effet: comp.effet }))
      break
  }

  const refDe = (id: number) => ref(p.entites.find(e => e.id === id)!)
  for (const id of bilan.infectes) dire(msg('infecte', { e: refDe(id) }))
  for (const id of bilan.desinfectes) dire(msg('desinfecte', { e: refDe(id) }))
  if (bilan.mandragores.length) dire(msg('mandragore', { es: bilan.mandragores.map(refDe) }))
  if (bilan.texte.length === 1) dire(msg('aucun-effet'))
  return { ok: true, partie: p, bilan }
}

function rendreFeuillus(arbres: Entite[], dire: (m: Message) => void) {
  for (const a of arbres) {
    if (a.feuillu) continue
    a.feuillu = true
    a.nom = 'Arbre Feuillu'
    dire(msg('devient-feuillu', { case: a.case }))
  }
}
