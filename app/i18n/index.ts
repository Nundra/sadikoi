/**
 * Traductions : français (défaut, adresse /), anglais (/en) et espagnol (/es).
 * - Textes de l'interface : fr.ts, en.ts, es.ts.
 * - Textes du jeu (noms et descriptions des sorts, invocations, maps, zones, donjons, boss,
 *   monstres) : data/traductions/<langue>.json, tirés des fichiers du jeu
 *   (scripts/extract-traductions.py), chargés à la demande. En français, les données d'origine.
 * - Rôles d'infection écrits à la main : infection.ts.
 */
import { ref, shallowRef } from 'vue'
import type { Message, RefEntite } from '~~/engine/messages'
import { invocation, sort as trouverSort, type Sort } from '~~/engine/sorts'
import { en } from './en'
import { es } from './es'
import { fr } from './fr'
import { INFECTION } from './infection'

export type Langue = 'fr' | 'en' | 'es'

export const LANGUES: { id: Langue, nom: string }[] = [
  { id: 'fr', nom: 'Français' },
  { id: 'en', nom: 'English' },
  { id: 'es', nom: 'Español' },
]

// Valeur d'un texte : une phrase avec des {paramètres}, ou une fonction (pluriels)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Entree = string | ((p: any) => string)
export type Dico = Record<string, Entree>
export type Cle = keyof typeof fr
export type DicoLangue = Record<Cle, Entree>
export type Params = Record<string, string | number>

const DICOS: Record<Langue, DicoLangue> = { fr, en, es }

/** Langue d'une adresse : /en/… → anglais, /es/… → espagnol, le reste en français. */
export function langueDuChemin(chemin: string): Langue {
  const m = chemin.match(/^\/(en|es)(\/|$)/)
  return (m?.[1] as Langue | undefined) ?? 'fr'
}

/** Début d'adresse d'une langue ('' en français). */
export const prefixe = (l: Langue) => (l === 'fr' ? '' : `/${l}`)

/**
 * Langue au chargement : celle de l'adresse (/en, /es) ; sur /, celle choisie à une visite
 * précédente (`sadikoi:langue`), sinon la première langue du navigateur que l'app connaît.
 */
function langueInitiale(): Langue {
  if (/^\/(en|es)(\/|$)/.test(window.location.pathname)) return langueDuChemin(window.location.pathname)
  try {
    const choisie = localStorage.getItem('sadikoi:langue')
    if (choisie && choisie in DICOS) return choisie as Langue
  } catch {
    // stockage indisponible : on suit le navigateur
  }
  for (const n of navigator.languages ?? [navigator.language]) {
    const l = n.slice(0, 2).toLowerCase()
    if (l in DICOS) return l as Langue
  }
  return 'fr'
}

export const langue = ref<Langue>(langueInitiale())

/** Garde le choix fait par le joueur (bouton de langue) pour ses prochaines visites sur /. */
export function retenirLangue(l: Langue) {
  try {
    localStorage.setItem('sadikoi:langue', l)
  } catch {
    // stockage indisponible : sans conséquence
  }
}

interface TraductionsJeu {
  sorts: Record<string, { nom: string, description: string }>
  invocations: Record<string, string>
  noms: Record<string, string>
}
const jeu = shallowRef<TraductionsJeu | null>(null)

const CHARGEURS: Record<Exclude<Langue, 'fr'>, () => Promise<{ default: unknown }>> = {
  en: () => import('~~/data/traductions/en.json'),
  es: () => import('~~/data/traductions/es.json'),
}

/** Charge les textes du jeu de la langue, puis l'applique (textes, adresse). */
export async function choisirLangue(l: Langue) {
  jeu.value = l === 'fr' ? null : (await CHARGEURS[l]()).default as TraductionsJeu
  // Le titre et l'attribut lang de la page suivent `langue` (useHead, app.vue)
  langue.value = l
  try {
    // L'adresse garde la langue : /en?salle=… ; le reste du chemin est ignoré (une seule page)
    const url = new URL(window.location.href)
    url.pathname = prefixe(l) || '/'
    window.history.replaceState(null, '', url)
  } catch {
    // adresse non modifiable (aperçu, iframe…) : sans conséquence
  }
}

/** Le texte d'une clé dans la langue choisie, avec ses paramètres. */
export function t(cle: Cle, p: Params = {}): string {
  const e = DICOS[langue.value][cle] ?? fr[cle]
  if (typeof e === 'function') return e(p)
  return e.replace(/\{(\w+)\}/g, (tout, k: string) => (k in p ? String(p[k]) : tout))
}

// Textes du jeu

export function nomSort(id: number): string {
  return jeu.value?.sorts[id]?.nom || trouverSort(id).nom
}

export function descriptionSort(s: Sort): string {
  return jeu.value?.sorts[s.id]?.description || s.description || ''
}

export function nomInvocation(monstre: number): string {
  return jeu.value?.invocations[monstre] || invocation(monstre).nom
}

/** Nom de map, de zone, de donjon, de boss ou de monstre (le texte français sert de clé). */
export function nomJeu(texte: string): string {
  return jeu.value?.noms[texte] ?? texte
}

/** Ce que fait un sort pour l'infection, dans la langue choisie. */
export function infectionDuSort(s: Sort): string {
  const texte = langue.value === 'fr' ? s.infection ?? INFECTION.fr[s.id] : INFECTION[langue.value][s.id]
  if (!texte) return t('sort.pas-infection')
  return texte.replace(/\{([si]):(\d+)\}/g, (_, type: string, id: string) => (type === 's' ? nomSort(Number(id)) : nomInvocation(Number(id))))
}

/** Un message du moteur en texte ; `nommer` donne le nom d'une entité (voir le store). */
export function texteMessage(m: Message, nommer: (r: RefEntite) => string): string {
  const p: Params = {}
  for (const [k, v] of Object.entries(m.p ?? {})) {
    if (Array.isArray(v)) p[k] = v.map(nommer).join(', ')
    else if (typeof v === 'object') p[k] = nommer(v)
    else if (k === 'sort') p[k] = nomSort(Number(v))
    else if (k === 'effet') p[k] = t(`effet.${v}` as Cle)
    else p[k] = v
  }
  return t(`m.${m.code}` as Cle, p)
}
