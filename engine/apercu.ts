import { distance, type Case } from './grille'
import { avancer, direction } from './mouvements'
import { entiteSur, type Partie } from './partie'
import { COMPORTEMENTS, POUPEES } from './sorts'
import { zone } from './zones'

/**
 * Les cases que toucherait le sort lancé sur `cible`, pour les colorer au survol.
 * C'est un aperçu : ce qui se passe vraiment (ennemis infectés…) vient de `jouer`.
 */
export function zoneDuSort(p: Partie, acteurId: number, sortId: number, cible: Case): Case[] {
  const comp = COMPORTEMENTS[sortId]
  const visee = entiteSur(p, cible)
  switch (comp?.type) {
    case 'infecte':
      return comp.zoneFeuillu && visee?.genre === 'arbre' && visee.feuillu ? zone(cible, 'cercle', comp.zoneFeuillu) : [cible]
    case 'propage':
    case 'sacrifie-poupee':
      return zone(cible, 'cercle', comp.rayon)
    case 'explosion': {
      // Visée sur une entité au contact, l'explosion part de La Sacrifiée
      const acteur = p.entites.find(e => e.id === acteurId)
      return acteur ? zone(acteur.case, 'cercle', comp.rayon) : [cible]
    }
    case 'miasmes': {
      const acteur = p.entites.find(e => e.id === acteurId)
      const centres = [acteur, ...p.entites.filter(e => (e.genre === 'arbre' && e.feuillu) || POUPEES.has(e.monstre!))]
      return [...new Set(centres.flatMap(e => (e ? zone(e.case, 'cercle', comp.rayon) : [])))]
    }
    case 'attire-centre':
      return zone(cible, 'cercle', comp.rayon)
    case 'pousse-jusqua':
    case 'attire-jusqua': {
      // La ligne entre l'invocation et la case visée (et au-delà pour le Tréant)
      const acteur = p.entites.find(e => e.id === acteurId)
      const dir = acteur && direction(acteur.case, cible)
      if (!acteur || !dir) return [cible]
      const out: Case[] = []
      const fin = comp.type === 'attire-jusqua' ? distance(acteur.case, cible) + comp.portee : distance(acteur.case, cible)
      for (let c: Case | null = acteur.case, k = 0; k < fin && (c = avancer(c, dir)) !== null; k++) out.push(c)
      return out
    }
    case 'repousse-autour': {
      const acteur = p.entites.find(e => e.id === acteurId)
      return acteur ? zone(acteur.case, 'croix_diag', 1) : [cible]
    }
    case 'echange': {
      const acteur = p.entites.find(e => e.id === acteurId)
      return acteur ? [cible, acteur.case] : [cible]
    }
    case 'feuillu':
      return comp.forme === 'tous' ? p.entites.filter(e => e.genre === 'arbre').map(e => e.case) : zone(cible, 'carre', comp.rayon)
    default:
      return [cible]
  }
}
