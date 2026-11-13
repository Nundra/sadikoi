<script setup lang="ts">
import { CATEGORIES } from '~~/engine/categories'
import { SORTS_SADIDA } from '~~/engine/sorts'
import { useBarreStore } from '~/stores/barre'
import { nomSort, t } from '~/i18n'

const store = usePartieStore()
const barre = useBarreStore()

/** Les emplacements de la barre du Sadida, avec la variante choisie et la touche. */
const emplacements = computed(() => barre.ordre.map((paire, k) => {
  const s = SORTS_SADIDA.find(x => x.id === store.variantes[paire]) ?? SORTS_SADIDA.find(x => x.paire === paire)!
  return { k, nom: nomSort(s.id), touche: barre.libelle(barre.touches[k] ?? '') }
}))
const dialogue = ref<HTMLDialogElement | null>(null)

defineExpose({ ouvrir: () => dialogue.value?.showModal() })

const total = computed(() => store.mapsActives.length)
/** Le dernier type coché ne peut pas être décoché. */
const seul = computed(() => Object.values(store.categoriesActives).filter(Boolean).length === 1)
</script>

<template>
  <dialog ref="dialogue" class="reglages" aria-labelledby="titre-reglages">
    <h2 id="titre-reglages">{{ t('reglages.titre') }}</h2>

    <fieldset>
      <legend>{{ t('reglages.langue') }}</legend>
      <ChoixLangue en-ligne />
    </fieldset>

    <fieldset class="apparence">
      <legend>{{ t('reglages.personnage') }}</legend>
      <div class="choix-sexe">
        <label v-for="v in ['femme', 'homme'] as const" :key="v" class="sexe">
          <input v-model="store.sexe" type="radio" name="sexe" :value="v">
          <img :src="`/portraits/sadida-${v}.png`" alt="">
          <span>{{ t(`reglages.${v}`) }}</span>
        </label>
      </div>
    </fieldset>

    <fieldset>
      <legend>{{ t('reglages.types') }}</legend>
      <p class="aide">{{ t('reglages.types-aide') }}</p>
      <label v-for="c in CATEGORIES" :key="c" class="categorie">
        <input
          type="checkbox"
          :checked="store.categoriesActives[c]"
          :disabled="seul && store.categoriesActives[c]"
          :aria-describedby="seul && store.categoriesActives[c] ? 'aide-seul' : undefined"
          @change="store.basculerCategorie(c)"
        >
        <span class="texte">
          <span class="nom">{{ t(`categorie.${c}`) }} <span class="compte">{{ t('reglages.maps', { n: store.compteParCategorie[c] }) }}</span></span>
          <span class="description">{{ t(`categorie.${c}.aide`) }}</span>
        </span>
      </label>
      <p class="total">
        {{ t('reglages.total', { n: total }) }}
        <span v-if="seul" id="aide-seul">{{ t('reglages.seul') }}</span>
      </p>
    </fieldset>

    <fieldset class="raccourcis">
      <legend>{{ t('reglages.raccourcis') }}</legend>
      <p class="aide">{{ t('reglages.raccourcis-aide') }}</p>
      <ol>
        <li v-for="e in emplacements" :key="e.k">
          <span class="numero">{{ e.k + 1 }}</span>
          <span class="sort">{{ e.nom }}</span>
          <button
            type="button"
            class="touche"
            :class="{ attente: barre.enAttente === e.k }"
            :aria-label="t('reglages.touche-de', { n: e.k + 1, nom: e.nom, touche: e.touche || t('reglages.aucune') })"
            @click="barre.enAttente = barre.enAttente === e.k ? null : e.k"
          >
            {{ barre.enAttente === e.k ? t('reglages.appuie') : e.touche || '—' }}
          </button>
        </li>
      </ol>
      <button type="button" class="retablir" @click="barre.retablir()">{{ t('reglages.retablir') }}</button>
    </fieldset>

    <form method="dialog" class="boutons">
      <button type="submit" class="fin" @click="barre.enAttente = null">{{ t('reglages.fermer') }}</button>
    </form>
  </dialog>
</template>

<style scoped>
.reglages {
  border-radius: 16px; border: 1px solid var(--or); background: linear-gradient(#18292f, #132227);
  color: var(--texte); padding: 22px 26px; width: min(620px, 92vw); max-height: 90vh;
}
.reglages::backdrop { background: rgb(5 10 12 / 0.7); }
h2 { margin: 0 0 14px; font-family: var(--police-titre); font-size: 24px; font-weight: 400; color: var(--or-clair); }
fieldset { margin: 0; padding: 0; border: 0; display: flex; flex-direction: column; gap: 8px; }
legend { padding: 0; font-size: 15px; font-weight: 800; color: var(--or-clair); }
.aide, .total { margin: 0; font-size: 12px; color: var(--texte-gris); }
.categorie {
  display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; border-radius: 10px;
  background: var(--fond-creux); border: 1px solid #263b41; cursor: pointer;
}
.categorie:has(input:checked) { border-color: var(--bord-clair); }
.categorie:has(input:disabled) { cursor: default; }
input { width: 18px; height: 18px; margin: 2px 0 0; accent-color: var(--or); flex: none; }
.texte { display: flex; flex-direction: column; gap: 2px; }
.nom { font-size: 14px; font-weight: 800; }
.compte { font-size: 12px; font-weight: 600; color: var(--texte-gris); }
.description { font-size: 12px; color: var(--texte-doux); }
.apparence { margin-bottom: 18px; }
.choix-sexe { display: flex; gap: 10px; }
.sexe {
  flex: 1; display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 10px;
  background: var(--fond-creux); border: 1px solid #263b41; cursor: pointer; font-size: 14px; font-weight: 800;
}
.sexe:has(input:checked) { border-color: var(--or); }
.sexe img { width: 56px; height: 56px; object-fit: contain; }
.raccourcis { margin-top: 18px; }
.raccourcis ol { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
.raccourcis li { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.raccourcis .numero { width: 18px; color: var(--texte-gris); font-size: 11px; text-align: right; }
.raccourcis .sort { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.raccourcis .touche { width: 64px; height: 28px; padding: 0; font-size: 12px; font-weight: 800; color: var(--or-clair); }
.raccourcis .touche.attente { border-color: var(--or); background: #3a2f17; }
.retablir { height: 34px; font-size: 12px; margin-top: 4px; }
.boutons { margin-top: 16px; }
.boutons button { width: 100%; }
</style>
