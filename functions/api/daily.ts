/**
 * Classement du défi du jour (Cloudflare Pages Functions, base D1 « DB », voir wrangler.toml et
 * migrations/).
 * - GET  /api/daily : le jour, la salle du jour (map et ennemis : elle fait foi pour tous les
 *   navigateurs) et le classement : chaque score validé avec son nombre de joueurs, et le nombre
 *   de joueurs qui n'ont pas encore validé.
 * - POST /api/daily : un tour joué sur la salle du jour (pas son score). Le serveur rejoue le tour
 *   avec le moteur et calcule lui-même le score ; il compte une fois par joueur et par score.
 * Rien de personnel n'est gardé : ni pseudo, ni adresse IP ; le joueur n'est que l'empreinte
 * d'un identifiant tiré au hasard par son navigateur.
 */
import reglages from '../../data/daily.json'
import {
  ETOILES_DAILY, jourDe, mapDuJour, rejouerDefi, salleDuJour,
  type ClassementDaily, type LigneClassement, type TourEnvoye,
} from '../../engine/daily'
import { VERSION_REGLES } from '../../engine/partie'
import { lireCodeSalle, type Salle } from '../../engine/salle'

interface Requete {
  bind: (...valeurs: unknown[]) => Requete
  all: <T>() => Promise<{ results: T[] }>
  first: <T>() => Promise<T | null>
  run: () => Promise<unknown>
}
interface D1 {
  prepare: (sql: string) => Requete
  batch: (requetes: Requete[]) => Promise<unknown>
}
interface Env {
  DB: D1
  ASSETS: { fetch: (url: URL | string) => Promise<Response> }
}
interface Contexte {
  request: Request
  env: Env
}

/** Les résultats sont gardés 30 jours. */
const JOURS_GARDES = 30

const json = (corps: unknown, status = 200) => new Response(JSON.stringify(corps), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
})

/** Empreinte SHA-256 de l'identifiant du joueur : on ne garde jamais l'identifiant lui-même. */
async function empreinte(joueur: string): Promise<string> {
  const octets = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`sadikoi:${joueur}`))
  return [...new Uint8Array(octets)].map(o => o.toString(16).padStart(2, '0')).join('')
}

async function classement(env: Env, jour: string): Promise<ClassementDaily> {
  const [lignes, sous] = await Promise.all([
    env.DB.prepare(`SELECT points, MAX(etoiles) AS etoiles, COUNT(*) AS joueurs
      FROM resultats WHERE jour = ? AND version = ? AND etoiles >= ?
      GROUP BY points ORDER BY points DESC`)
      .bind(jour, VERSION_REGLES, ETOILES_DAILY).all<LigneClassement>(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM (SELECT joueur FROM resultats WHERE jour = ? AND version = ?
      GROUP BY joueur HAVING MAX(etoiles) < ?)`)
      .bind(jour, VERSION_REGLES, ETOILES_DAILY).first<{ n: number }>(),
  ])
  return { lignes: lignes.results, sousLeSeuil: sous?.n ?? 0 }
}

/** La salle du jour, comme le navigateur la tire (engine/daily.ts, data/daily.json). */
async function salleDuJourServeur(env: Env, origine: string, jour: string): Promise<Salle | null> {
  const imposee = (reglages.salles as Record<string, string>)[jour]
  let id: number | undefined
  if (imposee) id = parseInt(imposee.split('-')[0] ?? '', 36)
  else {
    const candidats = await (await env.ASSETS.fetch(new URL('/_daily/candidats.json', origine))).json() as number[]
    id = mapDuJour(candidats.map(x => ({ id: x })), jour)?.id
  }
  if (id === undefined) return null
  const reponse = await env.ASSETS.fetch(new URL(`/_daily/cases/${id}.txt`, origine))
  if (!reponse.ok) return null
  const map = { id, nom: '', zone: '', sous_zone: '', pos: [0, 0] as [number, number], cases: await reponse.text() }
  if (imposee) return lireCodeSalle(imposee, [map])
  return salleDuJour(map, jour)
}

export async function onRequestGet({ request, env }: Contexte): Promise<Response> {
  const jour = jourDe()
  const [salle, top] = await Promise.all([salleDuJourServeur(env, request.url, jour), classement(env, jour)])
  return json({ jour, salle: salle && { map: salle.map.id, ennemis: salle.ennemis }, classement: top })
}

export async function onRequestPost({ request, env }: Contexte): Promise<Response> {
  let tour: TourEnvoye
  try {
    tour = await request.json() as TourEnvoye
  } catch {
    return json({ erreur: 'format' }, 400)
  }
  const jour = jourDe()
  // Envoyé juste après minuit : le défi a changé, le tour ne vaut plus
  if (tour?.jour !== jour) return json({ erreur: 'jour', jour }, 409)
  if (!Array.isArray(tour.actions) || tour.actions.length > 200 || !Array.isArray(tour.sorts)) return json({ erreur: 'format' }, 400)
  if (typeof tour.joueur !== 'string' || !/^[0-9a-f-]{36}$/.test(tour.joueur)) return json({ erreur: 'joueur' }, 400)

  const salle = await salleDuJourServeur(env, request.url, jour)
  if (!salle) return json({ erreur: 'salle' }, 500)
  const resultat = rejouerDefi(salle, tour)
  if (!resultat) return json({ erreur: 'tour' }, 422)

  const limite = jourDe(new Date(Date.now() - JOURS_GARDES * 24 * 3600 * 1000))
  await env.DB.batch([
    // Le même score refait par le même joueur ne compte pas une deuxième fois
    env.DB.prepare(`INSERT OR IGNORE INTO resultats (jour, version, points, etoiles, pa_depenses, prycipithon, joueur, date, tour)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(jour, VERSION_REGLES, resultat.points, resultat.etoiles, resultat.paDepenses, resultat.prycipithon ? 1 : 0,
        await empreinte(tour.joueur), Date.now(),
        JSON.stringify({ sadida: tour.sadida, sorts: tour.sorts, prycipithon: resultat.prycipithon, actions: tour.actions })),
    env.DB.prepare('DELETE FROM resultats WHERE jour < ?').bind(limite),
  ])
  return json({ jour, points: resultat.points, classement: await classement(env, jour) })
}
