import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'
import { zoneDuSort } from '~~/engine/apercu'
import type { Categorie } from '~~/engine/categories'
import { casesAccessibles, chemin } from '~~/engine/chemins'
import type { Case } from '~~/engine/grille'
import {
  PA_PRYCIPITHON, STATS_DEFAUT, VERSION_REGLES, acteurCourant, sortDe, arretTacle, jouer, nouvellePartie, plateau, refusCibleSpecifique, score as calculerScore, termine as estTermine,
  type Action, type Bilan, type Entite, type Partie, type Stats,
} from '~~/engine/partie'
import type { MapCombat } from '~~/engine/plateau'
import type { MapIndex } from 'virtual:maps'
import { casesCiblables, refusCible } from '~~/engine/portee'
import { NB_CASES } from '~~/engine/grille'
import { casesDuJoueur, codeSalle, lireCodeSalle, tirerSalle } from '~~/engine/salle'
import {
  carteDepuisSalle, carteVide, codeCarte, ennemisDe, lireCodeCarte, mapPerso, peindre, problemesCarte, type Outil,
} from '~~/engine/creation'
import { NIVEAU_MAX, SORTS_SADIDA, invocation, niveauRequis, sort as trouverSort, sortAuNiveau, type Sort } from '~~/engine/sorts'
import portraits from '~~/data/portraits.json'
import reglagesDaily from '~~/data/daily.json'
import { ETOILES_DAILY, aleaDe, candidatsDaily, jourDe, mapDuJour, salleDuJour, type ClassementDaily } from '~~/engine/daily'
import type { Message, RefEntite } from '~~/engine/messages'
import { langue, nomInvocation, nomJeu, prefixe, t, texteMessage, type Cle, type Params } from '~/i18n'
import { useBarreStore } from './barre'

export type Mode = 'infini' | 'map' | 'boss' | 'creation' | 'daily'

/** Meilleur résultat sur une salle. */
export interface MeilleurScore {
  points: number
  etoiles: number
  paDepenses: number
}

/** Une action jouée, avec la partie juste avant et juste après, et ce qu'elle a changé. */
export interface Etape {
  action: Action
  avant: Partie
  apres: Partie
  bilan: Bilan
}

/** Les paires de variantes, dans l'ordre de data/sorts.json. */
export const PAIRES: [Sort, Sort][] = (() => {
  const parPaire = new Map<number, Sort[]>()
  for (const s of SORTS_SADIDA) parPaire.set(s.paire!, [...(parPaire.get(s.paire!) ?? []), s])
  return [...parPaire.values()] as [Sort, Sort][]
})()

/** Variantes choisies au départ (celles de la maquette). */
const VARIANTES_DEFAUT = new Set([
  'La Folle', 'Arbre Feuillu', 'Ronce', 'Fléau', 'La Bloqueuse', 'Larme de Sadida', 'Miasmes', 'Ronce Apaisante',
  'Puissance Sylvestre', 'La Sacrifiée', 'Mandragore', 'Don Naturel', 'Sacrifice Vaudou', 'Contagion', 'Inoculation',
  'La Gonflable', 'Ronces Agressives', 'Arbre de Vie', 'Buisson Ardent', 'Vent Empoisonné', 'Malédiction Vaudou',
  'La Surpuissante',
])

function lire<T>(cle: string, defaut: T): T {
  try {
    const v = localStorage.getItem(`sadikoi:${cle}`)
    return v ? { ...defaut, ...JSON.parse(v) } : defaut
  } catch {
    return defaut
  }
}

function ecrire(cle: string, valeur: unknown) {
  try {
    localStorage.setItem(`sadikoi:${cle}`, JSON.stringify(valeur))
  } catch {
    // stockage indisponible (navigation privée…) : on garde la valeur en mémoire
  }
}

/** Par défaut, seulement les maps normales : zones à 10 places, donjons, Songes. */
const CATEGORIES_DEFAUT: Record<Categorie, boolean> = { zone: true, speciale: false, donjon: true, koli: false, songes: true, autre: false }

/** Bornes des caractéristiques réglables (PA, PM et PO de base, sans la Prycipithon). */
export const LIMITES_STATS: Record<keyof Stats, [number, number]> = { pa: [6, 12], pm: [3, 6], po: [0, 6], invo: [1, 8] }
export const NIVEAU_MIN = 1

const borner = (v: number, [min, max]: [number, number]) => Math.min(max, Math.max(min, Math.round(Number.isFinite(v) ? v : max)))

/** Mode infini : étoiles nécessaires pour passer à la salle suivante. */
export const ETOILES_POUR_AVANCER = 3

function auHasard<T>(liste: T[]): T {
  return liste[Math.floor(Math.random() * liste.length)]!
}

export const usePartieStore = defineStore('partie', () => {
  const barre = useBarreStore()
  /** L'index des maps (sans leurs cases, chargées à la demande : modules/maps.ts). */
  const maps = shallowRef<MapIndex[]>([])
  const mapsBoss = computed(() => maps.value.filter(m => m.boss))

  /** Type de chaque map (calculé au build). */
  const categories = shallowRef(new Map<number, Categorie>())
  /** Types de map tirés en mode infini et proposés à la recherche. */
  const categoriesActives = ref<Record<Categorie, boolean>>(lire('categories', CATEGORIES_DEFAUT))
  watch(categoriesActives, v => ecrire('categories', v), { deep: true })
  const mapsActives = computed(() => maps.value.filter(m => categoriesActives.value[categories.value.get(m.id) ?? 'zone']))
  const compteParCategorie = computed(() => {
    const compte: Record<Categorie, number> = { zone: 0, speciale: 0, donjon: 0, koli: 0, songes: 0, autre: 0 }
    for (const c of categories.value.values()) compte[c]++
    return compte
  })

  /** Active ou coupe un type de map ; on en garde toujours au moins un. */
  function basculerCategorie(c: Categorie) {
    const v = { ...categoriesActives.value, [c]: !categoriesActives.value[c] }
    if (Object.values(v).some(Boolean)) categoriesActives.value = v
  }
  const mode = ref<Mode>('infini')
  /** Map choisie dans les modes « map » et « boss ». */
  const mapChoisie = ref<number | null>(null)
  const numeroSalle = ref(0)
  const map = shallowRef<MapCombat | null>(null)
  const ennemis = ref<Case[]>([])
  /** Case du Sadida ; null tant qu'il n'est pas placé. */
  const sadida = ref<Case | null>(null)
  /** Personnage du Sadida sur le plateau (purement visuel). */
  const sexe = ref<'femme' | 'homme'>(lire('apparence', { sexe: 'femme' as 'femme' | 'homme' }).sexe)
  watch(sexe, v => ecrire('apparence', { sexe: v }))
  /** Monstre dessiné pour chaque ennemi de la salle (tiré au hasard, purement visuel). */
  /** Position, dans la liste de data/portraits.json, du monstre dessiné pour chaque ennemi. */
  const portraitsEnnemis = ref<number[]>([])
  const monstreDe = (e: { id: number }) => portraits.ennemis[portraitsEnnemis.value[e.id - 1] ?? 0] ?? portraits.ennemis[0]!
  /** Le portrait d'une entité (images de public/portraits, voir data/portraits.json). */
  function portrait(e: Entite): string {
    if (e.genre === 'sadida') return `/portraits/sadida-${sexe.value}.png`
    if (e.genre === 'ennemi') return `/portraits/${monstreDe(e).id}.png`
    // L'Arbre Feuillu n'a pas de portrait à lui dans le jeu : on prend celui de l'Arbre Asservi
    if (e.genre === 'arbre' && e.feuillu) return `/portraits/${portraits.arbreFeuillu}.png`
    return `/portraits/${e.monstre}.png`
  }
  /** Nom à afficher, dans la langue choisie : le monstre dessiné pour un ennemi (« Piou Bleu (E2) »). */
  function nomAffiche(e: RefEntite): string {
    if (e.genre === 'sadida') return 'Sadida'
    if (e.genre === 'ennemi') return `${nomJeu(monstreDe(e).nom)} (E${e.id})`
    if (e.genre === 'arbre') return t(e.feuillu ? 'entite.arbre-feuillu' : 'entite.arbre')
    return nomInvocation(e.monstre!)
  }
  /** Un message du moteur (refus, bilan) en texte. */
  const texte = (m: Message) => texteMessage(m, nomAffiche)
  /** D'abord le placement (à valider), puis le tour. */
  const phase = ref<'placement' | 'tour'>('placement')

  /**
   * Niveau et caractéristiques de base du Sadida, réglables (par défaut niveau 200, 12 PA / 6 PM / 6 PO, 4 invocations).
   * Le niveau débloque les sorts et donne leur rang (PO). Gardés dans `sadikoi:personnage`.
   */
  const personnage = lire('personnage', { niveau: NIVEAU_MAX, ...STATS_DEFAUT })
  const niveau = ref(borner(personnage.niveau, [NIVEAU_MIN, NIVEAU_MAX]))
  const stats = shallowRef<Stats>({
    pa: borner(personnage.pa, LIMITES_STATS.pa), pm: borner(personnage.pm, LIMITES_STATS.pm), po: borner(personnage.po, LIMITES_STATS.po),
    invo: borner(personnage.invo, LIMITES_STATS.invo),
  })
  watch([niveau, stats], ([n, st]) => ecrire('personnage', { niveau: n, ...st }))
  /** Prycipithon Mate équipée : +2 PA au tour 1, points × 0,9. */
  const prycipithon = ref<boolean>(lire('equipement', { prycipithon: false }).prycipithon)
  watch(prycipithon, v => ecrire('equipement', { prycipithon: v }))
  /**
   * Défi du jour : niveau et caractéristiques imposés (ceux par défaut), pour que tous les
   * joueurs se comparent à armes égales. Les réglages du joueur restent gardés à côté.
   */
  const statsImposees = computed(() => mode.value === 'daily')
  const niveauJeu = computed(() => (statsImposees.value ? NIVEAU_MAX : niveau.value))
  const statsJeu = computed<Stats>(() => (statsImposees.value ? STATS_DEFAUT : stats.value))
  /** Caractéristiques de départ du Sadida, Prycipithon comprise. */
  const statsDepart = computed<Stats>(() => (prycipithon.value ? { ...statsJeu.value, pa: statsJeu.value.pa + PA_PRYCIPITHON } : statsJeu.value))
  const variantes = ref<Record<number, number>>(lire('variantes', Object.fromEntries(
    PAIRES.map(([a, b]) => [a.paire!, VARIANTES_DEFAUT.has(a.nom) ? a.id : b.id]),
  )))
  watch(variantes, v => ecrire('variantes', v), { deep: true })

  const actions = ref<Action[]>([])
  const sortChoisi = ref<number | null>(null)
  const survol = ref<Case | null>(null)
  /**
   * Message affiché sur le plateau. Gardé comme une fonction qui le met en texte, pour suivre
   * un changement de langue.
   */
  const message = shallowRef<(() => string) | null>(null)
  const dire = (cle: Cle, p?: Params) => (message.value = () => t(cle, p))
  /** Action de la timeline qu'on regarde (son résultat), ou null pour le présent. */
  const vue = ref<number | null>(null)

  /** Le sort est débloqué au niveau choisi (les sorts d'invocation le sont toujours). */
  const debloque = (s: Sort) => niveauRequis(s) <= niveauJeu.value
  /** Variantes choisies et débloquées au niveau : celles qu'on joue. */
  const sortsChoisis = computed(() => Object.values(variantes.value).filter(id => debloque(trouverSort(id))))
  /** Un sort tel qu'il se lance au niveau choisi (PO du rang), ou au dernier rang s'il n'est pas débloqué. */
  const sortAffiche = (id: number) => sortAuNiveau(trouverSort(id), niveauJeu.value) ?? trouverSort(id)

  const depart = computed(() => map.value && sadida.value !== null
    // Copies simples : le moteur clone la partie avec structuredClone, qui refuse les proxys de Vue
    ? nouvellePartie({ cases: map.value.cases, sadida: sadida.value, ennemis: [...ennemis.value], sorts: [...sortsChoisis.value], stats: { ...statsJeu.value }, prycipithon: prycipithon.value, niveau: niveauJeu.value })
    : null)

  /** La partie rejouée action par action. S'arrête à la première action devenue impossible. */
  const deroule = computed(() => {
    if (!depart.value) return null
    let partie = depart.value
    const etapes: Etape[] = []
    for (const [index, action] of actions.value.entries()) {
      const r = jouer(partie, action)
      if (!r.ok) return { partie, etapes, erreur: { index, raison: r.raison } }
      etapes.push({ action, avant: partie, apres: r.partie, bilan: r.bilan })
      partie = r.partie
    }
    return { partie, etapes, erreur: null }
  })

  // Une variante ou une stat changée peut rendre une action impossible : on coupe là.
  watch(() => deroule.value?.erreur, (e) => {
    if (!e) return
    const raison = e.raison
    message.value = () => t('msg.action-retiree', { n: e.index + 1, raison: texte(raison) })
    actions.value = actions.value.slice(0, e.index)
  })

  const partie = computed(() => deroule.value?.partie ?? null)
  const etapes = computed(() => deroule.value?.etapes ?? [])
  const termine = computed(() => phase.value === 'tour' && partie.value !== null && estTermine(partie.value))
  const casesPlacement = computed(() => map.value ? casesDuJoueur(map.value) : [])

  /** Celui qui a la main (null pendant le placement ou une fois tout le monde passé). */
  const acteur = computed(() => (phase.value === 'tour' && partie.value ? acteurCourant(partie.value) ?? null : null))

  /** L'étape affichée : celle qu'on regarde, sinon la dernière jouée. */
  const etapeAffichee = computed(() => (vue.value === null ? etapes.value.at(-1) : etapes.value[vue.value]) ?? null)
  const partieAffichee = computed(() => (vue.value === null ? partie.value : etapeAffichee.value?.apres ?? partie.value))

  /** Les pions à dessiner (avant le placement : seulement les ennemis). */
  const entites = computed<Entite[]>(() => partieAffichee.value?.entites
    ?? ennemis.value.map((c, k) => ({ id: k + 1, genre: 'ennemi', nom: `Ennemi ${k + 1}`, case: c, pa: 0, pm: 0 })))

  /** Les entités déplacées par l'étape affichée : d'où elles partent, où elles arrivent. */
  const deplacements = computed(() => {
    const e = etapeAffichee.value
    if (!e) return []
    return e.apres.entites.flatMap((x) => {
      const avant = e.avant.entites.find(y => y.id === x.id)
      return avant && avant.case !== x.case ? [{ id: x.id, de: avant.case, vers: x.case }] : []
    })
  })

  /** Les sorts de celui qui joue : la barre du Sadida, ou ceux de l'invocation. */
  const sortsActeur = computed<Sort[]>(() => {
    const a = acteur.value
    if (a && a.genre === 'invocation') return invocation(a.monstre!).sorts
    // Dans l'ordre des emplacements de la barre, avec la variante choisie
    return barre.ordre.map((paire) => {
      const [x, y] = PAIRES.find(([z]) => z.paire === paire)!
      return sortAffiche(variantes.value[paire] === x.id ? x.id : y.id)
    })
  })

  const bonusPo = computed(() => (acteur.value?.genre === 'invocation' ? 0 : statsJeu.value.po))
  const interactif = computed(() => vue.value === null && acteur.value !== null)

  /** Cases de lancement du sort choisi (portée et ligne de vue), affichées en bleu comme en jeu. */
  const portee = computed(() => {
    const p = partie.value
    if (!p || !acteur.value || !interactif.value || sortChoisi.value === null) return new Set<Case>()
    const id = sortChoisi.value
    return new Set(casesCiblables(plateau(p), acteur.value.case, sortDe(p, id) ?? trouverSort(id), bonusPo.value))
  })

  /**
   * Parmi elles, celles où le sort se lance vraiment : ce qu'il exige de sa cible (une entité
   * au contact, un Arbre, une Poupée…). Seules celles-ci montrent la zone au survol.
   */
  const ciblables = computed(() => {
    const p = partie.value
    const a = acteur.value
    const id = sortChoisi.value
    if (!p || !a || id === null) return new Set<Case>()
    return new Set([...portee.value].filter(c => refusCibleSpecifique(p, a, id, c) === null))
  })

  /** Cases à portée du sort choisi mais sans ligne de vue (affichées à part, comme en jeu). */
  const sansVue = computed(() => {
    const p = partie.value
    const a = acteur.value
    if (!p || !a || !interactif.value || sortChoisi.value === null) return new Set<Case>()
    const s = sortDe(p, sortChoisi.value) ?? trouverSort(sortChoisi.value)
    const pl = plateau(p)
    const out = new Set<Case>()
    for (let c = 0; c < NB_CASES; c++) if (refusCible(pl, a.case, c, s, bonusPo.value) === 'pas-de-ldv') out.add(c)
    return out
  })

  const accessibles = computed(() => {
    const p = partie.value
    const a = acteur.value
    if (!p || !a || !interactif.value || sortChoisi.value !== null) return new Map<Case, number>()
    return casesAccessibles(plateau(p), a.case, a.pm, arretTacle(p, a))
  })

  /** Aperçu au survol : zone du sort et ennemis qu'il infecterait, ou chemin du déplacement. */
  const apercu = computed(() => {
    const p = partie.value
    const a = acteur.value
    const c = survol.value
    const vide = { zone: new Set<Case>(), infectes: new Set<number>(), chemin: new Set<Case>() }
    if (!p || !a || c === null || !interactif.value) return vide
    if (sortChoisi.value !== null) {
      if (!ciblables.value.has(c)) return vide
      const r = jouer(p, { type: 'sort', acteur: a.id, sort: sortChoisi.value, cible: c })
      return { ...vide, zone: new Set(zoneDuSort(p, a.id, sortChoisi.value, c)), infectes: new Set(r.ok ? r.bilan.infectes : []) }
    }
    if (accessibles.value.has(c) && c !== a.case) return { ...vide, chemin: new Set(chemin(plateau(p), a.case, c, a.pm, arretTacle(p, a))) }
    return vide
  })

  const score = computed(() => partie.value ? calculerScore(partie.value) : null)

  /**
   * Records par salle : même map, mêmes ennemis, mêmes caractéristiques (on ne compare pas
   * un tour à 14 PA avec un tour à 12), mêmes règles (VERSION_REGLES en tête de la clé ; ceux
   * d'une version précédente sont oubliés au chargement). Gardés dans le navigateur.
   */
  const prefixeRecords = `v${VERSION_REGLES}|`
  const records = ref<Record<string, MeilleurScore>>(Object.fromEntries(
    Object.entries(lire<Record<string, MeilleurScore>>('records', {})).filter(([cle]) => cle.startsWith(prefixeRecords))))
  const cleSalle = computed(() => map.value
    ? `${prefixeRecords}${map.value.id || `c${codeCarte(map.value.cases)}`}|${ennemis.value.join(',')}|${statsJeu.value.pa}-${statsJeu.value.pm}-${statsJeu.value.po}-i${statsJeu.value.invo}${niveauJeu.value < NIVEAU_MAX ? `|n${niveauJeu.value}` : ''}`
    : null)
  const record = computed(() => (cleSalle.value ? records.value[cleSalle.value] ?? null : null))
  /** Ce que valait le record avant la fin de la salle, pour dire « nouveau record ». */
  const recordPrecedent = ref<MeilleurScore | null>(null)

  /**
   * Chaque tour terminé, repéré par son placement et ses actions : un nouveau tour compte même
   * si l'on recommence et termine sans que « terminé » repasse à faux entre-temps.
   */
  const tourFini = computed(() => (termine.value ? `${sadida.value}|${JSON.stringify(actions.value)}` : null))

  watch(tourFini, (fin) => {
    const sc = score.value
    if (!fin || !sc || !cleSalle.value) return
    recordPrecedent.value = record.value
    if (record.value && record.value.points >= sc.points) return
    const tous = { ...records.value, [cleSalle.value]: { points: sc.points, etoiles: sc.etoiles, paDepenses: sc.paDepenses } }
    // On garde les 300 dernières salles améliorées
    const cles = Object.keys(tous)
    for (const c of cles.slice(0, Math.max(0, cles.length - 300))) delete tous[c]
    records.value = tous
    ecrire('records', tous)
  })

  /**
   * Défi du jour (/daily) : la même salle pour tous ce jour-là (engine/daily.ts, réglages à la
   * main dans data/daily.json). Il compte comme fait dès ETOILES_DAILY étoiles : plus
   * d'invitation à l'arrivée ce jour-là. `sadikoi:daily` garde, pour le jour : fait ou non, et les
   * scores déjà envoyés avec la version des règles en cours (le classement est par version : après
   * une mise en ligne qui la monte, un même score se renvoie). Chaque tour fini est envoyé une fois par score : le serveur compte les
   * joueurs de chaque score, un joueur étant un identifiant tiré au hasard (`sadikoi:joueur`).
   * Au classement, « toi » marque la ligne qui a les points de notre record de la salle du jour.
   */
  const jourDaily = ref(jourDe())
  const etatVide = () => ({ jour: jourDaily.value, fait: false, version: VERSION_REGLES, envoyes: [] as number[] })
  // Version 0 par défaut : un état gardé avant ce champ a été envoyé avec d'anciennes règles
  const lu = lire('daily', { ...etatVide(), version: 0 })
  const etatDaily = ref(lu.jour !== jourDaily.value ? etatVide() : lu.version === VERSION_REGLES ? lu : { ...lu, version: VERSION_REGLES, envoyes: [] })
  watch(etatDaily, v => ecrire('daily', v), { deep: true })
  const dailyFait = computed(() => etatDaily.value.fait)

  const joueur = lire('joueur', { id: '' }).id || crypto.randomUUID()
  ecrire('joueur', { id: joueur })

  /** Classement du jour (serveur, functions/api/daily.ts) ; null tant qu'il n'est pas chargé. */
  const classement = ref<ClassementDaily | null>(null)
  /** Le classement n'a pas pu être lu ou le tour pas envoyé (hors ligne, en dev sans API…). */
  const classementIndisponible = ref(false)
  /** Le tour a été refusé parce que le défi a changé entre-temps (minuit, heure de Paris). */
  const defiPerime = ref(false)

  /**
   * Appelle l'API du classement (6 s au plus : un serveur qui ne répond pas ne doit pas laisser
   * « Chargement… » à l'écran). Le serveur donne aussi le jour et la salle du jour, qui font foi.
   */
  async function appelerClassement(init?: RequestInit) {
    const arret = new AbortController()
    const delai = setTimeout(() => arret.abort(), 6000)
    try {
      const r = await fetch('/api/daily', { ...init, signal: arret.signal })
      if (r.status === 409) defiPerime.value = true
      if (!r.ok) throw new Error(String(r.status))
      const corps = await r.json() as { jour: string, classement: ClassementDaily, salle?: { map: number, ennemis: Case[] } }
      classement.value = corps.classement
      classementIndisponible.value = false
      return corps
    } catch {
      classementIndisponible.value = true
      return null
    } finally {
      clearTimeout(delai)
    }
  }

  watch(tourFini, async (fin) => {
    const sc = score.value
    if (!fin || !sc || mode.value !== 'daily') return
    if (sc.etoiles >= ETOILES_DAILY) etatDaily.value.fait = true
    // Chaque score n'est envoyé qu'une fois (le serveur ne le compterait pas deux fois) ; il rejoue le tour
    const envoyes = etatDaily.value.envoyes ?? []
    if (envoyes.includes(sc.points) || sadida.value === null) return
    const tour = { jour: jourDaily.value, joueur, sadida: sadida.value, sorts: [...sortsChoisis.value], prycipithon: prycipithon.value, actions: actions.value.map(a => ({ ...a })) }
    const corps = await appelerClassement({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(tour) })
    if (!corps) return
    etatDaily.value.envoyes = [...envoyes, sc.points]
  })

  /**
   * Charge le défi du jour. Le serveur donne le jour et la salle (une seule source pour tous,
   * même avec une horloge déréglée ou une ancienne version du site en cache) ; sans lui (hors
   * ligne, en dev), le navigateur fait le même tirage de son côté.
   */
  async function chargerDaily() {
    mode.value = 'daily'
    const numero = ++chargement
    const serveur = await appelerClassement()
    if (numero !== chargement) return
    const jour = serveur?.jour ?? jourDe()
    jourDaily.value = jour
    if (etatDaily.value.jour !== jour) etatDaily.value = etatVide()
    const imposee = (reglagesDaily.salles as Record<string, string>)[jour]
    const mi = serveur?.salle
      ? maps.value.find(m => m.id === serveur.salle!.map)
      : imposee
        ? maps.value.find(m => m.id === parseInt(imposee.split('-')[0] ?? '', 36))
        : mapDuJour(candidatsDaily(maps.value, new Set(reglagesDaily.exclues)), jour)
    if (!mi) return
    const complete = await avecCases(mi)
    if (numero !== chargement) return
    const salle = !serveur?.salle && imposee ? lireCodeSalle(imposee, [complete]) : null
    const tiree = serveur?.salle ? { ennemis: serveur.salle.ennemis } : salle ?? salleDuJour(complete, jour)
    const alea = aleaDe(`portraits:${jour}`)
    map.value = complete
    ennemis.value = tiree.ennemis
    portraitsEnnemis.value = salle ? salle.portraits : tiree.ennemis.map(() => Math.floor(alea() * portraits.ennemis.length))
    sadida.value = null
    numeroSalle.value = 1
    replacer()
  }

  async function charger() {
    if (maps.value.length) return
    const { index } = await import('virtual:maps')
    maps.value = index
    categories.value = new Map(index.map(m => [m.id, m.categorie]))
  }

  /** La map complète : son paquet de cases est chargé la première fois. */
  async function avecCases(m: MapIndex): Promise<MapCombat> {
    const { chargerCases } = await import('virtual:maps')
    const { categorie: _categorie, paquet: _paquet, ...sansIndex } = m
    return { ...sansIndex, cases: (await chargerCases(m)) ?? '' }
  }

  /** Numéro du dernier chargement demandé : un clic plus récent l'emporte sur un chargement en cours. */
  let chargement = 0

  async function nouvelleSalle() {
    const liste = mode.value === 'boss' ? mapsBoss.value : mode.value === 'infini' ? mapsActives.value : maps.value
    if (!liste.length) return
    const choisie = mode.value === 'infini' ? null : liste.find(m => m.id === mapChoisie.value)
    const mi = choisie ?? auHasard(liste)
    if (mode.value !== 'infini') mapChoisie.value = mi.id
    const numero = ++chargement
    const m = await avecCases(mi)
    if (numero !== chargement) return
    map.value = m
    ennemis.value = tirerSalle(m).ennemis
    portraitsEnnemis.value = ennemis.value.map(() => Math.floor(Math.random() * portraits.ennemis.length))
    sadida.value = null
    // En mode infini, le numéro est la place de la salle dans la run
    numeroSalle.value = mode.value === 'infini' ? serie.value + 1 : numeroSalle.value + 1
    replacer()
  }

  /**
   * Créateur de map : on construit une map (`brouillon`, gardé dans `sadikoi:creation`) en
   * peignant ses cases, puis on la teste comme une salle de training (`edition` à faux).
   * Les ennemis sont sur les cases `b`, les départs du joueur sur les `r` (engine/creation.ts).
   */
  const brouillonGarde = lire('creation', { cases: '' }).cases
  const brouillon = ref<string>(lireCodeCarte(codeCarte(brouillonGarde || carteVide())) ?? carteVide())
  watch(brouillon, v => ecrire('creation', { cases: v }))
  const edition = ref(true)
  const outil = ref<Outil>('sol')
  /** La map avant chaque trait de pinceau (50 au plus), pour « Annuler ». */
  const historique = shallowRef<string[]>([])
  let enTrait = false
  const problemes = computed(() => problemesCarte(brouillon.value))
  const enEdition = computed(() => mode.value === 'creation' && edition.value)
  /** La dernière salle du jeu jouée avant le créateur, pour partir de sa map. */
  const salleDuJeu = shallowRef<{ map: MapCombat, ennemis: Case[] } | null>(null)

  /** Montre le brouillon sur le plateau (monstre dessiné tiré de la case, pour qu'il ne change pas à chaque trait). */
  function montrerBrouillon() {
    map.value = mapPerso(brouillon.value)
    ennemis.value = ennemisDe(brouillon.value)
    portraitsEnnemis.value = ennemis.value.map(c => c % portraits.ennemis.length)
  }
  watch(brouillon, () => {
    if (enEdition.value) montrerBrouillon()
  })

  function memoriser() {
    historique.value = [...historique.value.slice(-49), brouillon.value]
  }
  function debutTrait(c: Case) {
    memoriser()
    enTrait = true
    peindreCase(c)
  }
  function peindreCase(c: Case) {
    if (enTrait) brouillon.value = peindre(brouillon.value, c, outil.value)
  }
  function finTrait() {
    if (!enTrait) return
    enTrait = false
    // Un trait qui n'a rien changé ne compte pas dans l'historique
    if (historique.value.at(-1) === brouillon.value) historique.value = historique.value.slice(0, -1)
  }
  function annulerTrait() {
    const h = historique.value
    if (!h.length) return
    brouillon.value = h.at(-1)!
    historique.value = h.slice(0, -1)
  }
  function remplacerCarte(cases: string) {
    memoriser()
    brouillon.value = cases
  }
  const carteDeZero = () => remplacerCarte(carteVide())
  function carteDeLaSalle() {
    if (salleDuJeu.value) remplacerCarte(carteDepuisSalle(salleDuJeu.value.map, salleDuJeu.value.ennemis))
  }

  /** Passe en créateur de map, sur le brouillon. */
  function ouvrirCreation() {
    if (mode.value !== 'creation' && map.value && map.value.id) salleDuJeu.value = { map: map.value, ennemis: [...ennemis.value] }
    mode.value = 'creation'
    mapChoisie.value = null
    modifierCarte()
  }
  /** Retour à la construction : le tour en cours est effacé. */
  function modifierCarte() {
    edition.value = true
    sadida.value = null
    replacer()
    montrerBrouillon()
  }
  /** Joue la map construite, comme une salle de training. */
  function testerCarte() {
    if (problemes.value.length) {
      dire(`creation.probleme.${problemes.value[0]!}`)
      return
    }
    edition.value = false
    outil.value = 'sol'
    montrerBrouillon()
    sadida.value = null
    numeroSalle.value++
    replacer()
  }

  /**
   * Code de la salle en cours, à partager. En training (map ou boss), il est gardé dans l'URL
   * (?salle=…) pour qu'un rechargement redonne la même salle ; en mode infini, il en est retiré
   * pour qu'un rechargement relance un tirage. Dans le créateur, c'est le code de la map perso
   * (?carte=…), en construction comme en test.
   */
  const code = computed(() => {
    if (mode.value === 'creation') return codeCarte(brouillon.value)
    return map.value ? codeSalle(map.value, ennemis.value, portraitsEnnemis.value) : null
  })
  const parametre = computed(() => (mode.value === 'creation' ? 'carte' : 'salle'))
  watch([code, mode], ([c, m]) => {
    if (!c) return
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete(m === 'creation' ? 'salle' : 'carte')
      if (m === 'infini' || m === 'daily') url.searchParams.delete('salle')
      else url.searchParams.set(parametre.value, c)
      window.history.replaceState(null, '', url)
    } catch {
      // URL non modifiable (aperçu, iframe…) : sans conséquence
    }
  })
  const lienPartage = computed(() => {
    if (mode.value === 'daily') return new URL(`${prefixe(langue.value)}/daily`, window.location.origin).toString()
    if (!code.value) return null
    const url = new URL(prefixe(langue.value) || '/', window.location.origin)
    url.searchParams.set(parametre.value, code.value)
    return url.toString()
  })

  /**
   * Ouvre une map perso partagée (?carte=…) dans le créateur : en test si elle est jouable,
   * sinon en construction. Le brouillon d'avant reste dans l'historique (« Annuler »).
   */
  function chargerCarte(texte: string) {
    const cases = lireCodeCarte(texte)
    if (!cases) {
      nouvelleSalle()
      dire('msg.carte-inconnue')
      return
    }
    if (cases !== brouillon.value) remplacerCarte(cases)
    mode.value = 'creation'
    if (problemesCarte(cases).length) modifierCarte()
    else testerCarte()
  }

  /** Charge la salle d'un code partagé ; sinon, une nouvelle salle et un message. */
  async function chargerCode(texte: string) {
    // L'id de la map est en tête du code (base 36) : on charge ses cases avant de lire le reste
    const mi = maps.value.find(m => m.id === parseInt(texte.trim().toLowerCase().split('-')[0] ?? '', 36))
    const numero = ++chargement
    const complete = mi ? await avecCases(mi) : null
    if (numero !== chargement) return
    const salle = complete && lireCodeSalle(texte, [complete])
    if (!salle) {
      nouvelleSalle()
      dire('msg.code-inconnu')
      return
    }
    mode.value = 'map'
    mapChoisie.value = salle.map.id
    map.value = salle.map
    ennemis.value = salle.ennemis
    portraitsEnnemis.value = salle.portraits.map(k => (k < portraits.ennemis.length ? k : 0))
    sadida.value = null
    numeroSalle.value++
    replacer()
  }

  /**
   * Mode infini : une run est une suite de salles. On ne passe à la suivante qu'avec
   * ETOILES_POUR_AVANCER étoiles ; sinon on rejoue la salle ou on recommence la run.
   */
  const serie = ref(0)
  const meilleureSerie = ref(lire('run', { meilleure: 0 }).meilleure)
  watch(meilleureSerie, v => ecrire('run', { meilleure: v }))
  const peutAvancer = computed(() => mode.value !== 'infini' || (termine.value && (score.value?.etoiles ?? 0) >= ETOILES_POUR_AVANCER))

  function salleSuivante() {
    if (!peutAvancer.value) {
      dire('msg.etoiles-requises', { n: ETOILES_POUR_AVANCER })
      return
    }
    if (mode.value === 'infini') {
      serie.value++
      meilleureSerie.value = Math.max(meilleureSerie.value, serie.value)
    }
    nouvelleSalle()
  }

  /**
   * Rejouer la salle : depuis le mode infini, on passe en training sur cette même salle
   * (mêmes ennemis) ; la run s'arrête là.
   */
  function rejouerSalle() {
    if (mode.value === 'infini' && map.value) {
      mode.value = 'map'
      mapChoisie.value = map.value.id
      serie.value = 0
    }
    recommencer()
  }

  function nouvelleRun() {
    serie.value = 0
    nouvelleSalle()
  }

  /** Copie le lien de la salle dans le presse-papiers. */
  async function partager() {
    try {
      await navigator.clipboard.writeText(lienPartage.value!)
      dire('msg.lien-copie', { code: code.value! })
    } catch {
      dire('msg.copie-impossible', { lien: lienPartage.value! })
    }
  }

  /** Retour au placement : le tour est effacé. */
  function replacer() {
    phase.value = 'placement'
    recommencer()
    message.value = null
  }

  function recommencer() {
    actions.value = []
    sortChoisi.value = null
    vue.value = null
    message.value = null
  }

  function validerPlacement() {
    if (sadida.value === null) {
      dire('msg.placer-dabord')
      return
    }
    phase.value = 'tour'
    message.value = null
  }

  function tenter(action: Action): boolean {
    const p = partie.value
    if (!p) return false
    const r = jouer(p, action)
    if (!r.ok) {
      const raison = r.raison
      message.value = () => texte(raison)
      return false
    }
    actions.value = [...actions.value, action]
    return true
  }

  function clicCase(c: Case) {
    message.value = null
    if (vue.value !== null) {
      dire('msg.vue-passee')
      return
    }
    if (phase.value === 'placement') {
      if (!casesPlacement.value.includes(c)) dire('msg.case-bleue')
      else sadida.value = c
      return
    }
    const a = acteur.value
    if (!a) return
    if (sortChoisi.value !== null) {
      if (tenter({ type: 'sort', acteur: a.id, sort: sortChoisi.value, cible: c })) sortChoisi.value = null
      return
    }
    if (c !== a.case) tenter({ type: 'deplacement', acteur: a.id, vers: c })
  }

  function choisirSort(id: number) {
    message.value = null
    if (enEdition.value) return
    if (phase.value === 'placement') {
      dire('msg.valider-dabord')
      return
    }
    const s = trouverSort(id)
    if (!debloque(s)) {
      message.value = () => texte({ code: 'niveau-requis', p: { sort: id, niveau: niveauRequis(s) } })
      return
    }
    sortChoisi.value = sortChoisi.value === id ? null : id
  }

  function finDuTour() {
    const a = acteur.value
    if (!a || vue.value !== null) return
    sortChoisi.value = null
    tenter({ type: 'fin', acteur: a.id })
  }

  /** Variantes et caractéristiques sont fixées une fois le placement validé. */
  const verrouille = computed(() => phase.value === 'tour')

  function changerVariante(paire: number) {
    if (verrouille.value) return
    const [a, b] = PAIRES.find(([x]) => x.paire === paire)!
    const ancien = variantes.value[paire]
    variantes.value = { ...variantes.value, [paire]: ancien === a.id ? b.id : a.id }
    if (sortChoisi.value === ancien) sortChoisi.value = variantes.value[paire]!
  }

  /** Change le niveau ou une caractéristique de base, dans ses bornes (pas pendant le tour). */
  function changerNiveau(v: number) {
    if (!verrouille.value) niveau.value = borner(v, [NIVEAU_MIN, NIVEAU_MAX])
  }
  function changerStat(cle: keyof Stats, v: number) {
    if (!verrouille.value) stats.value = { ...stats.value, [cle]: borner(v, LIMITES_STATS[cle]) }
  }
  function retablirPersonnage() {
    if (verrouille.value) return
    niveau.value = NIVEAU_MAX
    stats.value = { ...STATS_DEFAUT }
  }

  function basculerPrycipithon() {
    if (verrouille.value) return
    prycipithon.value = !prycipithon.value
  }

  function annuler() {
    actions.value = actions.value.slice(0, -1)
    vue.value = null
    message.value = null
  }

  /** Regarde le résultat d'une action passée (null : retour au présent). */
  function regarder(index: number | null) {
    sortChoisi.value = null
    message.value = null
    vue.value = index === null || index >= etapes.value.length - 1 ? null : Math.max(0, index)
  }

  return {
    maps, mapsBoss, mapsActives, categories, categoriesActives, compteParCategorie, basculerCategorie, mode, mapChoisie, jourDaily, dailyFait, chargerDaily, statsImposees, classement, classementIndisponible, defiPerime, numeroSalle, map, sadida, phase, niveau, stats, statsDepart, prycipithon, debloque, sortAffiche, changerNiveau, changerStat, retablirPersonnage, variantes, actions, sortChoisi, survol,
    message, vue, partie, etapes, termine, casesPlacement, acteur, etapeAffichee, partieAffichee, entites, deplacements,
    sortsActeur, verrouille, bonusPo, interactif, portee, ciblables, sansVue, accessibles, apercu, score, record, recordPrecedent,
    brouillon, edition, outil, historique, problemes, enEdition, salleDuJeu, debutTrait, peindreCase, finTrait, annulerTrait,
    carteDeZero, carteDeLaSalle, ouvrirCreation, modifierCarte, testerCarte, chargerCarte,
    sexe, portrait, nomAffiche, texte, code, lienPartage, chargerCode, partager, serie, meilleureSerie, peutAvancer, salleSuivante, nouvelleRun, rejouerSalle, charger, nouvelleSalle, replacer, recommencer, validerPlacement, clicCase, choisirSort, finDuTour, changerVariante,
    basculerPrycipithon, annuler, regarder,
  }
})
