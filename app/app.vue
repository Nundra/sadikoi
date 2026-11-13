<script setup lang="ts">
import { useRaccourcis } from '~/stores/barre'

const store = usePartieStore()

useHead({ title: 'Sadikoi – entraînement à l’infection au tour 1' })

// Raccourcis de la barre : la touche d'un emplacement choisit son sort, Échap le relâche
useRaccourcis(
  (k) => {
    const s = store.sortsActeur[k]
    if (s) store.choisirSort(s.id)
  },
  () => (store.sortChoisi = null),
)

onMounted(async () => {
  await store.charger()
  // Lien partagé : ?salle=<code>. On retire le code de l'URL une fois la salle chargée,
  // pour qu'un rechargement de la page relance un tirage.
  const url = new URL(window.location.href)
  const code = url.searchParams.get('salle')
  if (code) {
    store.chargerCode(code)
    url.searchParams.delete('salle')
    try {
      window.history.replaceState(null, '', url)
    } catch {
      // URL non modifiable (aperçu, iframe…) : sans conséquence
    }
  } else {
    store.nouvelleSalle()
  }
})
</script>

<template>
  <div class="ecran">
    <Bandeau />
    <main>
      <Plateau />
      <aside>
        <Timeline />
        <FicheSort />
      </aside>
    </main>
    <footer>
      <Caracteristiques />
      <BarreSorts />
    </footer>
  </div>
</template>

<style scoped>
.ecran {
  height: 100vh;
  min-height: 760px;
  display: flex;
  flex-direction: column;
  background: radial-gradient(120% 90% at 40% 45%, #16303a 0%, #0e1c22 55%, #0a1317 100%);
}
main {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: 20px;
  padding: 16px 24px 12px;
}
aside { min-height: 0; display: flex; flex-direction: column; gap: 14px; }
footer { display: flex; gap: 16px; padding: 0 24px 16px; }
</style>
