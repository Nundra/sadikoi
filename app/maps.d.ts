/** Module produit par modules/maps.ts à partir de data/maps.json. */
declare module 'virtual:maps' {
  import type { Categorie } from '~~/engine/categories'
  import type { MapCombat } from '~~/engine/plateau'

  /** Une map sans ses cases, avec son type et le paquet qui contient ses cases. */
  export type MapIndex = Omit<MapCombat, 'cases'> & { categorie: Categorie, paquet: number }
  export const index: MapIndex[]
  /** Les cases d'une map (son paquet est chargé la première fois). */
  export function chargerCases(m: MapIndex): Promise<string | undefined>
}
