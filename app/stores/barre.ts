import { defineStore } from 'pinia'
import { onScopeDispose, ref, watch } from 'vue'
import { ORDRE_JEU, sort } from '~~/engine/sorts'
import { langue, t } from '~/i18n'

/** Nombre d'emplacements : 2 rangées de 11. */
export const EMPLACEMENTS = 22

/**
 * Touches par défaut (codes physiques du clavier, indépendants de la disposition) :
 * la rangée des chiffres, puis celle de A à P.
 */
const TOUCHES_DEFAUT = [
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus',
  'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft',
]

/** Touche par défaut de « Fin du tour ». */
const TOUCHE_FIN_DEFAUT = 'F1'

/** Libellés AZERTY des codes, quand le navigateur ne sait pas lire la disposition (Firefox). */
const AZERTY: Record<string, string> = {
  Digit1: '&', Digit2: 'é', Digit3: '"', Digit4: '\'', Digit5: '(', Digit6: '-', Digit7: 'è', Digit8: '_', Digit9: 'ç', Digit0: 'à',
  Minus: ')', Equal: '=', KeyQ: 'A', KeyW: 'Z', KeyE: 'E', KeyR: 'R', KeyT: 'T', KeyY: 'Y', KeyU: 'U', KeyI: 'I', KeyO: 'O',
  KeyP: 'P', BracketLeft: '^', BracketRight: '$', KeyA: 'Q', KeyS: 'S', KeyD: 'D', KeyF: 'F', KeyG: 'G', KeyH: 'H', KeyJ: 'J',
  KeyK: 'K', KeyL: 'L', Semicolon: 'M', Quote: 'ù', KeyZ: 'W', KeyX: 'X', KeyC: 'C', KeyV: 'V', KeyB: 'B', KeyN: 'N', KeyM: ',',
  Comma: ';', Period: ':', Slash: '!', Backquote: '²', IntlBackslash: '<',
}

/** Signes QWERTY des codes de ponctuation (les lettres et chiffres se lisent dans le code). */
const QWERTY: Record<string, string> = {
  Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: '\'', Comma: ',', Period: '.',
  Slash: '/', Backquote: '`', Backslash: '\\', IntlBackslash: '\\',
}

function lireListe<T>(cle: string, valide: (v: unknown) => v is T[], defaut: T[]): T[] {
  try {
    const v = JSON.parse(localStorage.getItem(`sadikoi:${cle}`) ?? 'null')
    return valide(v) ? v : defaut
  } catch {
    return defaut
  }
}

function ecrire(cle: string, valeur: unknown) {
  try {
    localStorage.setItem(`sadikoi:${cle}`, JSON.stringify(valeur))
  } catch {
    // stockage indisponible : on garde la valeur en mémoire
  }
}

export const useBarreStore = defineStore('barre', () => {
  // Par défaut, l'ordre du grimoire du jeu
  const paires = ORDRE_JEU.map(id => sort(id).paire!)

  /** Paire de sorts posée dans chaque emplacement (la variante choisie s'affiche). */
  const ordre = ref<number[]>(lireListe('barre', (v): v is number[] =>
    Array.isArray(v) && v.length === paires.length && paires.every(p => v.includes(p)), paires))
  /** Code de touche de chaque emplacement ('' : aucune). */
  const touches = ref<string[]>(lireListe('touches', (v): v is string[] =>
    Array.isArray(v) && v.length === EMPLACEMENTS && v.every(x => typeof x === 'string'), TOUCHES_DEFAUT))
  /** Touche de « Fin du tour » ('' : aucune). */
  const toucheFin = ref<string>(lireListe('touche-fin', (v): v is string[] =>
    Array.isArray(v) && v.length === 1 && typeof v[0] === 'string', [TOUCHE_FIN_DEFAUT])[0]!)
  watch(ordre, v => ecrire('barre', v), { deep: true })
  watch(toucheFin, v => ecrire('touche-fin', [v]))
  watch(touches, v => ecrire('touches', v), { deep: true })

  /** Disposition réelle du clavier, si le navigateur la donne (Chromium). */
  const disposition = ref<Map<string, string> | null>(null)
  const clavier = (navigator as Navigator & { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard
  clavier?.getLayoutMap?.().then(m => (disposition.value = m)).catch(() => {})

  function libelle(code: string): string {
    if (!code) return ''
    const lu = disposition.value?.get(code)
    if (code === 'Space') return t('touche.Space').toUpperCase()
    // Sans la disposition réelle : AZERTY en français, QWERTY (le nom du code) sinon
    return (lu ?? (langue.value === 'fr' ? AZERTY : QWERTY)[code] ?? code.replace(/^(Key|Digit|Numpad)/, '')).toUpperCase()
  }

  /** Échange deux emplacements (glisser-déposer). */
  function echanger(a: number, b: number) {
    if (a === b) return
    const v = [...ordre.value]
    ;[v[a], v[b]] = [v[b]!, v[a]!]
    ordre.value = v
  }

  /**
   * Donne une touche à un emplacement ou à « Fin du tour » ('fin') ; elle est retirée de celui
   * qui l'avait.
   */
  function assigner(cible: number | 'fin', code: string) {
    touches.value = touches.value.map((t, k) => (k === cible ? code : code && t === code ? '' : t))
    if (cible === 'fin') toucheFin.value = code
    else if (code && toucheFin.value === code) toucheFin.value = ''
  }

  function retablir() {
    ordre.value = paires
    touches.value = TOUCHES_DEFAUT
    toucheFin.value = TOUCHE_FIN_DEFAUT
  }

  /** Emplacement (ou 'fin') en attente d'une touche dans les réglages (null : aucun). */
  const enAttente = ref<number | 'fin' | null>(null)

  return { ordre, touches, toucheFin, libelle, echanger, assigner, retablir, enAttente }
})

/** Ce que font les raccourcis : `choisir` reçoit l'emplacement de la barre. */
interface Raccourcis {
  choisir: (emplacement: number) => void
  echap: () => void
  finDuTour: () => void
  /** Ctrl+Z (Cmd+Z sur Mac). */
  annuler: () => void
}

/**
 * Raccourcis clavier : appelé une fois par l'app. Ignore les touches tapées dans un champ,
 * une fenêtre ouverte, ou avec Ctrl / Alt / Cmd (sauf Ctrl+Z).
 */
export function useRaccourcis({ choisir, echap, finDuTour, annuler }: Raccourcis) {
  const barre = useBarreStore()
  const surTouche = (ev: KeyboardEvent) => {
    if (barre.enAttente !== null) {
      ev.preventDefault()
      ev.stopPropagation()
      if (ev.code !== 'Escape') barre.assigner(barre.enAttente, ev.code === 'Backspace' || ev.code === 'Delete' ? '' : ev.code)
      barre.enAttente = null
      return
    }
    if (ev.target instanceof Element && ev.target.closest('input, select, textarea, dialog[open]')) return
    // Ctrl+Z : la lettre Z de la disposition (W physique en AZERTY), pas le code
    if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && !ev.shiftKey && ev.key.toLowerCase() === 'z') {
      ev.preventDefault()
      return annuler()
    }
    if (ev.ctrlKey || ev.altKey || ev.metaKey || ev.repeat) return
    if (ev.code === 'Escape') return echap()
    if (barre.toucheFin && ev.code === barre.toucheFin) {
      // F1 ouvrirait l'aide du navigateur
      ev.preventDefault()
      return finDuTour()
    }
    const k = barre.touches.indexOf(ev.code)
    if (k < 0) return
    ev.preventDefault()
    choisir(k)
  }
  // En capture : on passe avant la fenêtre de réglages (Échap ne doit pas la fermer pendant une saisie)
  window.addEventListener('keydown', surTouche, true)
  onScopeDispose(() => window.removeEventListener('keydown', surTouche, true))
}
