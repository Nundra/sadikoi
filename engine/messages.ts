/**
 * Messages du moteur (refus d'une action, bilan pour la timeline) : un code et ses paramètres,
 * jamais une phrase. L'interface les traduit (app/i18n). Une entité est passée par sa
 * référence, pour que l'interface la nomme dans la bonne langue ; `sort` est un id de sort.
 */

export interface RefEntite {
  id: number
  genre: 'sadida' | 'ennemi' | 'arbre' | 'invocation'
  monstre?: number
  feuillu?: boolean
}

export type ValeurMessage = number | string | RefEntite | RefEntite[]

export type CodeMessage =
  // Refus d'une action
  | 'tour-termine' | 'tour-de' | 'acteur-mort' | 'ne-se-deplace-pas' | 'deja-sur-case' | 'tacle' | 'hors-atteinte'
  | 'sort-inconnu' | 'sort-absent' | 'niveau-requis' | 'relance-initiale' | 'pa-insuffisants' | 'lancers-par-tour' | 'lancers-par-cible'
  | 'hors-portee' | 'pas-en-ligne' | 'pas-en-diagonale' | 'pas-en-ligne-ni-diagonale' | 'pas-de-ldv'
  | 'case-non-ciblable' | 'case-occupee'
  | 'viser-arbre' | 'viser-arbre-feuillu' | 'viser-entite-contact' | 'viser-allie'
  | 'viser-entite' | 'viser-centre-tremblement'
  // Titre d'une action (première ligne du bilan)
  | 'titre-deplacement' | 'titre-sort-entite' | 'titre-sort-case' | 'titre-fin'
  // Détail d'une action
  | 'au-tour-de' | 'fin-salle' | 'invoquee' | 'ne-bouge-pas' | 'attirance' | 'poussee' | 'recul'
  | 'exploite' | 'pas-exploitation' | 'arbre-plante' | 'arbre-feuillu-plante' | 'devient-feuillu'
  | 'infection-maintenue' | 'pas-de-maintien' | 'infection-reduite' | 'pas-de-propagation'
  | 'poupee-sacrifiee' | 'explose' | 'echange' | 'gain-pm' | 'intaclable' | 'non-simule'
  | 'infecte' | 'desinfecte' | 'mandragore' | 'aucun-effet'

export interface Message {
  code: CodeMessage
  p?: Record<string, ValeurMessage>
}

export function msg(code: CodeMessage, p?: Record<string, ValeurMessage>): Message {
  return p ? { code, p } : { code }
}
