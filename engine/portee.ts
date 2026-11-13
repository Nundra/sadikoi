import { NB_CASES, distance, enDiagonale, enLigne, type Case } from './grille'
import { ligneDeVue } from './ldv'
import { libre, marchable, type Plateau } from './plateau'

/** Ce qui limite la cible d'un sort (mêmes noms que dans data/sorts.json). */
export interface ReglesPortee {
  po_min: number
  po_max: number
  po_modifiable?: boolean
  ligne_de_vue?: boolean
  en_ligne?: boolean
  en_diagonale?: boolean
  case_libre?: boolean
}

export type RaisonRefus = 'hors de portée' | 'pas en ligne' | 'pas en diagonale' | 'pas en ligne ni en diagonale'
  | 'pas de ligne de vue' | 'case non ciblable' | 'case occupée'

/** PO max une fois le bonus de PO du lanceur ajouté (jamais sous la PO min). */
export function poMax(sort: ReglesPortee, bonusPo: number): number {
  return sort.po_modifiable ? Math.max(sort.po_min, sort.po_max + bonusPo) : sort.po_max
}

/** Pourquoi le sort ne peut pas viser `cible`, ou null s'il le peut. */
export function refusCible(p: Plateau, lanceur: Case, cible: Case, sort: ReglesPortee, bonusPo = 0): RaisonRefus | null {
  if (!marchable(p, cible)) return 'case non ciblable'
  const d = distance(lanceur, cible)
  if (d < sort.po_min || d > poMax(sort, bonusPo)) return 'hors de portée'
  if (sort.en_ligne && sort.en_diagonale) {
    if (!enLigne(lanceur, cible) && !enDiagonale(lanceur, cible)) return 'pas en ligne ni en diagonale'
  } else if (sort.en_ligne && !enLigne(lanceur, cible)) {
    return 'pas en ligne'
  } else if (sort.en_diagonale && !enDiagonale(lanceur, cible)) {
    return 'pas en diagonale'
  }
  if (sort.case_libre && !libre(p, cible)) return 'case occupée'
  if (sort.ligne_de_vue !== false && !ligneDeVue(p, lanceur, cible)) return 'pas de ligne de vue'
  return null
}

export function casesCiblables(p: Plateau, lanceur: Case, sort: ReglesPortee, bonusPo = 0): Case[] {
  const out: Case[] = []
  for (let c = 0; c < NB_CASES; c++) if (refusCible(p, lanceur, c, sort, bonusPo) === null) out.push(c)
  return out
}
