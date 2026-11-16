/**
 * Classement du défi du jour (Cloudflare Pages Functions, KV « DAILY », voir wrangler.toml).
 * - GET  /api/daily : le top du jour, sans les tours.
 * - POST /api/daily : un tour joué sur la salle du jour (pas son score). Le serveur rejoue le tour
 *   avec le moteur et calcule lui-même le score ; il entre au classement s'il y a sa place
 *   (une ligne par valeur de points, la plus ancienne reste).
 * Rien de personnel n'est gardé : ni pseudo, ni adresse IP.
 */
import reglages from '../../data/daily.json'
import {
  cleClassement, insererClassement, jourDe, mapDuJour, rejouerDefi, salleDuJour,
  type EntreeClassement, type TourEnvoye,
} from '../../engine/daily'
import { lireCodeSalle, type Salle } from '../../engine/salle'

interface KV {
  get: (cle: string) => Promise<string | null>
  put: (cle: string, valeur: string, options?: { expirationTtl?: number }) => Promise<void>
}
interface Env {
  DAILY: KV
  ASSETS: { fetch: (url: URL | string) => Promise<Response> }
}
interface Contexte {
  request: Request
  env: Env
}

/** Les classements sont gardés 30 jours. */
const DUREE = 30 * 24 * 3600

const json = (corps: unknown, status = 200) => new Response(JSON.stringify(corps), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
})

/** Le top du jour, sans les tours (seulement ce qui s'affiche). */
const public_ = (top: EntreeClassement[]) => top.map(({ tour: _tour, ...e }) => e)

async function lireTop(env: Env, jour: string): Promise<EntreeClassement[]> {
  return JSON.parse((await env.DAILY.get(cleClassement(jour))) ?? '[]') as EntreeClassement[]
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

export async function onRequestGet({ env }: Contexte): Promise<Response> {
  const jour = jourDe()
  return json({ jour, top: public_(await lireTop(env, jour)) })
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

  const salle = await salleDuJourServeur(env, request.url, jour)
  if (!salle) return json({ erreur: 'salle' }, 500)
  const resultat = rejouerDefi(salle, tour)
  if (!resultat) return json({ erreur: 'tour' }, 422)

  const top = await lireTop(env, jour)
  const entree: EntreeClassement = {
    id: crypto.randomUUID(),
    ...resultat,
    date: Date.now(),
    tour: { sadida: tour.sadida, sorts: tour.sorts, prycipithon: resultat.prycipithon, actions: tour.actions },
  }
  const suite = insererClassement(top, entree)
  if (suite) await env.DAILY.put(cleClassement(jour), JSON.stringify(suite), { expirationTtl: DUREE })
  return json({ jour, points: resultat.points, id: suite ? entree.id : null, top: public_(suite ?? top) })
}
