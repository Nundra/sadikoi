<script setup lang="ts">
import { choisirLangue, langue, t } from '~/i18n'
import { useRaccourcis } from '~/stores/barre'

const store = usePartieStore()

useHead({ title: () => t('app.titre'), htmlAttrs: { lang: langue } })

// Raccourcis de la barre : la touche d'un emplacement choisit son sort, Échap le relâche
useRaccourcis(
  (k) => {
    const s = store.sortsActeur[k]
    if (s) store.choisirSort(s.id)
  },
  () => (store.sortChoisi = null),
)

onMounted(async () => {
  // Langue de l'adresse (/en, /es) : ses textes du jeu, chargés avec les maps
  await Promise.all([store.charger(), choisirLangue(langue.value)])
  // Lien partagé (ou rechargement en training) : ?salle=<code> charge cette salle en training
  const code = new URLSearchParams(window.location.search).get('salle')
  if (code) store.chargerCode(code)
  else store.nouvelleSalle()
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
