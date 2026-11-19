import donnees from '../data/sorts.json'
import type { ReglesPortee } from './portee'

/** Un sort de data/sorts.json (Sadida ou invocation), avec ce qui sert au moteur. */
export interface Sort extends ReglesPortee {
  id: number
  nom: string
  pa: number
  paire?: number
  lancers_par_tour?: number | null
  lancers_par_cible?: number | null
  relance_initiale?: number | null
  role?: string
  /** Ce que le sort fait pour l'infection, en clair (data/infection-roles.json). */
  infection?: string
  variante_de?: { id: number, nom: string }
  description?: string
  /** Rangs du sort (Sadida) : niveau du joueur qui le débloque, PA et PO à ce rang. Le sort lui-même est au dernier rang. */
  rangs?: Rang[]
  effets: { action: number, sous_sort?: number, cibles: string, duree?: number, etat?: { id: number, nom: string } }[]
}

export interface Rang {
  niveau: number
  pa: number
  po_min: number
  po_max: number
}

export interface Invocation {
  id: number
  nom: string
  pa: number
  pm: number
  sorts: Sort[]
}

export const SORTS_SADIDA = donnees.sorts as Sort[]
export const INVOCATIONS = donnees.invocations as Invocation[]
/** Les sorts du Sadida dans l'ordre du grimoire du jeu, un par paire. */
export const ORDRE_JEU = donnees.ordre as number[]

export const ARBRE = 5894
export const LA_FOLLE = 5896
export const LA_SACRIFIEE = 5898
export const GROUTE = 5901
export const TREANT = 5900
/** Invocations Intaclables d'office : la Groute et le Tréant (les deux variantes de la paire). */
export const INTACLABLES = new Set([GROUTE, TREANT])
/** Les Poupées : invocations du Sadida autour desquelles jouent Miasmes, Sacrifice Vaudou… */
export const POUPEES = new Set([5895, 5896, 5897, 5898, 5899, 7934])

const parId = new Map<number, Sort>([
  ...SORTS_SADIDA.map(s => [s.id, s] as const),
  ...INVOCATIONS.flatMap(i => i.sorts.map(s => [s.id, s] as const)),
])

export function sort(id: number): Sort {
  const s = parId.get(id)
  if (!s) throw new Error(`sort inconnu : ${id}`)
  return s
}

export const NIVEAU_MAX = 200

/** Niveau du joueur qui débloque le sort (1 pour les sorts d'invocation, qui n'ont pas de rangs). */
export function niveauRequis(s: Sort): number {
  return s.rangs?.[0]?.niveau ?? 1
}

/**
 * Le sort au rang que donne le niveau du joueur (PA et PO de ce rang), ou null s'il n'est pas
 * encore débloqué. Les effets restent ceux du dernier rang.
 */
export function sortAuNiveau(s: Sort, niveau: number): Sort | null {
  const r = s.rangs?.filter(x => x.niveau <= niveau).at(-1)
  if (!s.rangs?.length) return s
  return r ? { ...s, pa: r.pa, po_min: r.po_min, po_max: r.po_max } : null
}

export function invocation(id: number): Invocation {
  const i = INVOCATIONS.find(i => i.id === id)
  if (!i) throw new Error(`invocation inconnue : ${id}`)
  return i
}

/**
 * Le sort fait profiter tous les Infectés de ses effets quand il vise un Infecté
 * (« exploite ») : d'après le rôle écrit à la main, ou le sous-sort 29615 réservé
 * aux cibles Infectées (E263) dans les effets du jeu.
 */
export const ETAT_INFECTE = 263

/** Durée (en tours) de l'Infection que pose le sort, lue dans ses effets ; 1 par défaut. */
export function dureeInfection(s: Sort): number {
  return s.effets.find(e => e.action === 950 && e.etat?.id === ETAT_INFECTE)?.duree || 1
}

export function exploite(s: Sort): boolean {
  return /xploite/.test(s.role ?? '') || s.effets.some(e => e.sous_sort === 29615 && e.cibles.includes('E263'))
}

/**
 * Ce que fait chaque sort pour l'infection au T1. C'est notre lecture des effets et de
 * data/infection-roles.json : à corriger ici si un test en jeu la contredit.
 * Les sorts absents de la table se lancent (PA dépensés) mais ne changent rien.
 */
export type Comportement =
  /** Plante un Arbre. `toutFeuillu` : rend aussi Feuillus tous les Arbres. */
  | { type: 'arbre', feuillu: boolean, toutFeuillu?: boolean }
  /** Invoque sur une case libre. */
  | { type: 'invoque', monstre: number }
  /** Remplace un Arbre (Feuillu si `feuilluRequis`) par l'invocation. */
  | { type: 'remplace-arbre', monstre: number, feuilluRequis: boolean }
  /**
   * Infecte l'ennemi visé. `zoneFeuillu` : sur un Arbre Feuillu, infecte en cercle autour.
   * `mandragore` : pose aussi l'état Mandragore, sur tous les Infectés si le sort exploite.
   */
  | { type: 'infecte', zoneFeuillu?: number, mandragore?: boolean }
  /**
   * Cigüe : sur un ennemi Infecté, porte son Infection à `duree` tours ; sur un Arbre Feuillu,
   * fait de même pour les Infectés en cercle de `zoneFeuillu`. N'infecte pas un ennemi sain.
   */
  | { type: 'maintient', duree: number, zoneFeuillu: number }
  /** Ronce Insolente, Détoxication : réduit de `tours` la durée de l'Infection (sur tous les Infectés si le sort exploite). */
  | { type: 'reduit', tours: number }
  /** Sur un ennemi Infecté : infecte en cercle autour de lui. */
  | { type: 'propage', rayon: number }
  /** Infecte en cercle autour du lanceur, de chaque Arbre Feuillu et de chaque Poupée. */
  | { type: 'miasmes', rayon: number }
  /** Sur une Poupée : la sacrifie et infecte en cercle autour d'elle. */
  | { type: 'sacrifie-poupee', rayon: number }
  /** Rend Feuillus les Arbres de la zone (rayon 0 : l'Arbre visé), ou tous. */
  | { type: 'feuillu', forme: 'carre' | 'tous', rayon: number }
  /** Sur un Infecté : retire l'Infection de tous les ennemis. */
  | { type: 'desinfecte' }
  /** La Sacrifiée : vise une entité à son contact, infecte en cercle autour d'elle et meurt. */
  | { type: 'explosion', rayon: number }
  /**
   * Tremblement : vise le lanceur, un Arbre Feuillu ou une Poupée, et attire de `distance`
   * cases vers lui les entités en cercle de `rayon` autour.
   */
  | { type: 'attire-centre', rayon: number, distance: number }
  /** Rejet Sylvestre : la première entité sur la ligne est infectée et poussée jusqu'à la case visée. */
  | { type: 'pousse-jusqua' }
  /** Étreinte Sylvestre : la première entité à partir de la case visée (sur `portee` cases) est infectée et attirée jusqu'à elle. */
  | { type: 'attire-jusqua', portee: number }
  /** Brise Automnale : repousse de `distance` cases les entités sur les 4 cases en diagonale. */
  | { type: 'repousse-autour', distance: number }
  /** Substitution (La Bloqueuse) : échange de position avec l'allié visé. */
  | { type: 'echange' }
  /** Donne des PM : à soi (Célérité) ou à l'entité visée (Ardeur Estivale). `intaclable` : ignore le tacle. */
  | { type: 'gain-pm', pm: number, soi: boolean, intaclable?: boolean }
  /** Harmonie : le lanceur devient Intaclable pour le tour. */
  | { type: 'intaclable' }
  /** Effet qui compte mais pas encore simulé. */
  | { type: 'non-simule', effet: 'teleporte-invocation' }

export const COMPORTEMENTS: Record<number, Comportement> = {
  // Arbres
  13519: { type: 'arbre', feuillu: false },
  13560: { type: 'arbre', feuillu: true, toutFeuillu: true },
  13534: { type: 'arbre', feuillu: true }, // Arbre de Vie (relance initiale : pas au T1)
  // Poupées invoquées directement (variantes « Transmutée »)
  13515: { type: 'invoque', monstre: 5896 },
  13526: { type: 'invoque', monstre: 5895 },
  13522: { type: 'invoque', monstre: 5898 },
  13523: { type: 'invoque', monstre: 5897 },
  13520: { type: 'invoque', monstre: 5899 },
  // Invocations qui remplacent un Arbre
  13564: { type: 'remplace-arbre', monstre: 5896, feuilluRequis: false },
  13561: { type: 'remplace-arbre', monstre: 5895, feuilluRequis: false },
  13567: { type: 'remplace-arbre', monstre: 5898, feuilluRequis: false },
  13573: { type: 'remplace-arbre', monstre: 5897, feuilluRequis: false },
  13578: { type: 'remplace-arbre', monstre: 5899, feuilluRequis: false },
  13530: { type: 'remplace-arbre', monstre: GROUTE, feuilluRequis: true },
  13566: { type: 'remplace-arbre', monstre: TREANT, feuilluRequis: true },
  // Infection
  13516: { type: 'infecte', zoneFeuillu: 2 }, // Ronce
  13533: { type: 'infecte' }, // Sève Paralysante
  13529: { type: 'infecte' }, // Vent Empoisonné
  13559: { type: 'infecte', mandragore: true }, // Mandragore : fixe l'infection pour le tour suivant
  13562: { type: 'miasmes', rayon: 2 },
  13575: { type: 'propage', rayon: 2 }, // Contagion
  13531: { type: 'sacrifie-poupee', rayon: 2 }, // Sacrifice Vaudou
  13569: { type: 'desinfecte' }, // Inoculation
  13577: { type: 'maintient', duree: 3, zoneFeuillu: 2 }, // Cigüe
  13521: { type: 'reduit', tours: 1 }, // Ronce Insolente
  // Feuillu
  13528: { type: 'feuillu', forme: 'carre', rayon: 0 }, // Larme de Sadida
  13563: { type: 'feuillu', forme: 'carre', rayon: 1 }, // Montée de Sève
  14396: { type: 'feuillu', forme: 'tous', rayon: 0 }, // Mangrove
  13579: { type: 'intaclable' }, // Harmonie : le Sadida devient Intaclable
  // Pas encore simulé
  13514: { type: 'attire-centre', rayon: 3, distance: 2 }, // Tremblement
  13565: { type: 'non-simule', effet: 'teleporte-invocation' }, // Rempotage
  // Sorts des invocations
  14380: { type: 'infecte' }, // Agacement (La Folle)
  14385: { type: 'explosion', rayon: 2 }, // Explosion Ouatée (La Sacrifiée)
  13536: { type: 'pousse-jusqua' }, // Rejet Sylvestre (Groute)
  13538: { type: 'reduit', tours: 2 }, // Détoxication (Groute) : -2 tours aux effets de la cible
  13591: { type: 'attire-jusqua', portee: 7 }, // Étreinte Sylvestre (Tréant)
  29624: { type: 'repousse-autour', distance: 4 }, // Brise Automnale (La Gonflable)
  18669: { type: 'echange' }, // Substitution (La Bloqueuse) : le Tacle gagné n'est pas simulé
  29623: { type: 'gain-pm', pm: 4, soi: true, intaclable: true }, // Célérité (La Bloqueuse)
  14381: { type: 'gain-pm', pm: 3, soi: false }, // Ardeur Estivale (La Surpuissante)
}
