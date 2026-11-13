import { COMPORTEMENTS, type Sort } from '~~/engine/sorts'

/** Élément affiché d'un sort : celui de ses dommages, sinon son rôle. */
export type Element = 'Terre' | 'Feu' | 'Eau' | 'Air' | 'Support' | 'Invocation'

export const COULEUR_ELEMENT: Record<Element, string> = {
  Terre: '#9a6630', Feu: '#c0482e', Eau: '#2f78b8', Air: '#4f9a43', Support: '#6f7a72', Invocation: '#7d4fb8',
}

// Actions de dommages et de vol de vie (data/sorts.json, effets[].action)
const ACTION_ELEMENT: Record<number, Element> = { 91: 'Eau', 92: 'Terre', 93: 'Air', 94: 'Feu', 96: 'Eau', 97: 'Terre', 98: 'Air', 99: 'Feu' }

export function elementDuSort(s: Sort): Element {
  if (s.role === 'Invocation') return 'Invocation'
  const comp = COMPORTEMENTS[s.id]
  if (comp?.type === 'invoque' || comp?.type === 'remplace-arbre') return 'Invocation'
  for (const e of s.effets) if (ACTION_ELEMENT[e.action]) return ACTION_ELEMENT[e.action]!
  return 'Support'
}

/** Ce que fait un sort d'invocation pour l'infection (ceux du Sadida l'ont dans data/infection-roles.json). */
const INFECTION_INVOCATIONS: Record<number, string> = {
  14380: 'Infecte la cible. Un lancer par cible : jusqu’à 2 ennemis par tour.',
  14385: 'Il faut un ennemi au contact. Infecte en cercle de 2 autour de la case visée, puis La Sacrifiée meurt.',
  13536: 'En ligne : la première entité entre le Groute et la case visée est infectée et poussée jusqu’à cette case.',
  13591: 'En ligne : la première entité à partir de la case visée (7 cases au-delà) est infectée et attirée jusqu’à cette case.',
  29624: 'Repousse de 4 cases les entités sur les 4 cases en diagonale autour de La Gonflable.',
  18669: 'Échange de place avec l’allié visé : pour rapprocher des ennemis une invocation qui joue après (La Sacrifiée, La Folle…).',
  29623: '+4 PM à La Bloqueuse, qui devient Intaclable : elle peut quitter le contact d’un ennemi.',
  14381: '+3 PM à la cible : une invocation qui joue après (La Sacrifiée, La Folle…) va plus loin.',
}

export function infectionDuSort(s: Sort): string {
  return s.infection ?? INFECTION_INVOCATIONS[s.id] ?? 'Pas d’infection.'
}

export function porteeDuSort(s: Sort, bonusPo: number): string {
  const max = s.po_modifiable ? Math.max(s.po_min, s.po_max + bonusPo) : s.po_max
  return s.po_min === max ? `${max}` : `${s.po_min}-${max}`
}

/**
 * La description officielle du sort sans ce qui concerne les dégâts : on garde l'utilité
 * (invocation, zone, Feuillu, exploitation, infection). Renvoie des paragraphes.
 */
export function descriptionUtile(s: Sort): string[] {
  const nettoyer = (ligne: string) => ligne
    // « … et occasionne des dommages Terre (aux ennemis) (en zone) » ; « soigne … ou occasionne … »
    .replace(/,? (et|ou) (occasionne|occasionner) des dommages \p{L}+( aux ennemis)?( en zone)?/gu, '')
    // « peut soigner, occasionner des dommages Feu et repousser » ; « peut occasionner des dommages Terre, retirer… »
    .replace(/, occasionner des dommages \p{L}+/gu, '')
    .replace(/occasionner des dommages \p{L}+, /gu, '')
    // « Occasionne des dommages Air et applique… » → « Applique… »
    .replace(/^(•\s*)?Occasionne des dommages \p{L}+( aux ennemis)? et (\p{L})/u, (_, puce = '', _a, l: string) => `${puce}${l.toUpperCase()}`)
    // « … poison Air de début de tour » : un poison est un dégât
    .replace(/ et (lui )?applique(r)? un poison \p{L}+ de (début|fin) de tour( sur la cible| sur les ennemis en zone)?/gu, '')
    .replace(/, retire de l'Esquive PM et applique un poison \p{L}+ de fin de tour/u, '')
    // « Occasionne des dommages Terre aux ennemis et leur applique… »
    .replace(/^Leur applique/, 'Applique aux ennemis')
    .trim()
  const paragraphes = (s.description ?? '').split(/\n\s*\n/).map(p => p.split('\n')
    .map(nettoyer)
    // Lignes qui ne parlent que de dégâts, de vol de vie ou de soins reçus
    .filter(l => l && !/(occasionne|occasionner) des dommages|dommages (du sort|finaux|sont)|Vole de la vie|poison \p{L}+ de (début|fin) de tour/iu.test(l)))
  // Un paragraphe réduit à une phrase d'introduction (« … : ») sans sa liste ne veut plus rien dire
  return paragraphes
    .filter(p => p.length && !(p.length === 1 && p[0]!.endsWith(':')))
    .map(p => p.join('\n'))
}
