import { COMPORTEMENTS, type Sort } from '~~/engine/sorts'
import { descriptionSort, langue, type Langue } from '~/i18n'

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

export function porteeDuSort(s: Sort, bonusPo: number): string {
  const max = s.po_modifiable ? Math.max(s.po_min, s.po_max + bonusPo) : s.po_max
  return s.po_min === max ? `${max}` : `${s.po_min}-${max}`
}

/** Nettoyage d'une ligne de description, et lignes à retirer, pour chaque langue. */
const FILTRES: Record<Langue, { nettoyer: (ligne: string) => string, retirer: RegExp }> = {
  fr: {
    nettoyer: ligne => ligne
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
      .replace(/^Leur applique/, 'Applique aux ennemis'),
    // Lignes qui ne parlent que de dégâts, de vol de vie ou de soins reçus
    retirer: /(occasionne|occasionner) des dommages|dommages (du sort|finaux|sont)|Vole de la vie|poison \p{L}+ de (début|fin) de tour/iu,
  },
  en: {
    nettoyer: ligne => ligne
      // « Inflicts Earth damage (on enemies) (on) and applies… » → « Applies… »
      .replace(/^(•\s*)?Inflicts \p{L}+ damage( on enemies)?( on)? and (\p{L})/u, (_, puce = '', _a, _b, l: string) => `${puce}${l.toUpperCase()}`)
      .replace(/^Applies (.+?) on them/, 'Applies $1 on enemies')
      // « Heals allies and inflicts Water damage on and removes MP from enemies »
      .replace(/inflicts \p{L}+ damage on and /gu, '')
      // « … and inflicts Earth damage (on enemies) » ; « heals allies or inflicts… »
      .replace(/,? (and|or) inflicts? \p{L}+ damage( on enemies)?/gu, '')
      // « can heal, inflict Fire damage and repel » ; « can inflict Earth damage, remove MP… »
      .replace(/, inflict \p{L}+ damage/gu, '')
      .replace(/inflict \p{L}+ damage, /gu, '')
      // « … an end-of-turn Air poison » : un poison est un dégât
      .replace(/^Infects and applies an? (start|end)-of-turn \p{L}+ poison on /u, 'Infects ')
      .replace(/,? (and )?(applies|apply) an? (start|end)-of-turn \p{L}+ poison( on (it|the target))?/gu, ''),
    retirer: /inflicts? (\p{L}+ )?damage|damage (is|are)|spell'?s? damage|final damage|Steals HP|(start|end)-of-turn \p{L}+ poison/iu,
  },
  es: {
    nettoyer: ligne => ligne
      // « Ocasiona daños de aire (a los enemigos) y aplica… » → « Aplica… »
      .replace(/^(•\s*)?(Ocasiona|Provoca) daños de \p{L}+( a los enemigos)? y (\p{L})/u, (_, puce = '', _a, _b, l: string) => `${puce}${l.toUpperCase()}`)
      .replace(/^Les aplica/, 'Aplica a los enemigos')
      // « puede ocasionar daños de tierra, retirar PM… » ; « … daños de tierra y retirar… » (avant la règle suivante)
      .replace(/(ocasionar|provocar) daños de \p{L}+, /gu, '')
      .replace(/puede (ocasionar|provocar) daños de \p{L}+ y /gu, 'puede ')
      // « … y provoca daños de tierra (a los enemigos) » ; « cura a los aliados u ocasiona… » ; « cura, ocasiona daños… y retira »
      .replace(/,? (y |u |o )?(ocasiona|provoca|ocasionar|provocar) daños de \p{L}+( a los enemigos)?(?= |\.|,|$)/gu, '')
      // « … un veneno de aire de inicio de turno » : un veneno es un daño
      .replace(/^Infecta y aplica un veneno de \p{L}+ de (inicio|final) de turno a /u, 'Infecta a ')
      .replace(/, retira esquiva de PM y aplica un veneno de \p{L}+ de (inicio|final) de turno/u, '')
      .replace(/ y (le )?(aplica|aplicar) un veneno de \p{L}+ de (inicio|final) de turno( al objetivo)?/gu, ''),
    retirer: /(ocasiona|provoca|ocasionar|provocar) daños|daños (del hechizo|finales|son)|Roba vida|veneno de \p{L}+ de (inicio|final) de turno/iu,
  },
}

/**
 * La description officielle du sort, dans la langue choisie, sans ce qui concerne les dégâts :
 * on garde l'utilité (invocation, zone, Feuillu, exploitation, infection). Renvoie des paragraphes.
 */
export function descriptionUtile(s: Sort): string[] {
  const { nettoyer, retirer } = FILTRES[langue.value]
  const paragraphes = descriptionSort(s).split(/\n\s*\n/).map(p => p.split('\n')
    // Une puce (•) est un seul effet : si elle parlait de dégâts, on la retire entière
    .filter(l => !(l.trim().startsWith('•') && retirer.test(l)))
    .map(l => nettoyer(l).trim())
    .filter(l => l && !retirer.test(l)))
  // Une phrase d'introduction (« … : ») dont toute la liste a été retirée se termine par un point
  return paragraphes
    .filter(p => p.length)
    .map(p => (p.length === 1 ? [p[0]!.replace(/\s*:$/, '.')] : p).join('\n'))
}
