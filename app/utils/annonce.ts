import { VERSION_REGLES } from '~~/engine/partie'

/**
 * Annonce d'une mise à jour du moteur (fenêtre `AnnonceMoteur`) : montrée une seule fois par
 * joueur (`sadikoi:annonce` garde la version annoncée), et seulement tant que le moteur est à
 * cette version des règles : la version suivante ne la montre plus. Pour une nouvelle annonce,
 * changer `VERSION_ANNONCE` et les textes `annonce.*`.
 */
export const VERSION_ANNONCE = 6

/** L'annonce est à montrer : bonne version du moteur, pas encore vue, et ce n'est pas la première visite. */
export function annonceAFaire(): boolean {
  if (VERSION_REGLES !== VERSION_ANNONCE) return false
  try {
    return localStorage.getItem('sadikoi:bienvenue') === 'vue' && localStorage.getItem('sadikoi:annonce') !== String(VERSION_ANNONCE)
  } catch {
    // stockage indisponible : on ne pourrait pas retenir qu'elle a été vue, on ne la montre pas
    return false
  }
}

/** L'annonce est vue (ou inutile : un nouveau joueur découvre les règles avec la bienvenue). */
export function annonceVue() {
  try {
    localStorage.setItem('sadikoi:annonce', String(VERSION_ANNONCE))
  } catch {
    // stockage indisponible : rien à retenir
  }
}
