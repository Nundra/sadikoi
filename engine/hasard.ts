/** Un hasard reproductible, tiré d'un texte (FNV-1a puis mulberry32). */
export function aleaDe(graine: string): () => number {
  let h = 2166136261
  for (let k = 0; k < graine.length; k++) h = Math.imul(h ^ graine.charCodeAt(k), 16777619)
  let a = h >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
