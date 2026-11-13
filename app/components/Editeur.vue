<script setup lang="ts">
import { MAX_ENNEMIS, OUTILS, departsDe, ennemisDe, type Outil } from '~~/engine/creation'
import { t } from '~/i18n'

/**
 * Créateur de map, phase de construction : à la place de la timeline. On choisit un outil,
 * on peint le plateau, puis « Tester la map » la joue comme une salle de training.
 */
const store = usePartieStore()

/** Couleur de chaque outil : celle de la case sur le plateau. */
const COULEUR: Record<Outil, string> = {
  sol: '#567541', vide: 'transparent', obstacle: '#6b736c', depart: '#3c86c9', ennemi: '#b94e3a',
}

const departs = computed(() => departsDe(store.brouillon).length)
const ennemis = computed(() => ennemisDe(store.brouillon).length)

// Ctrl+Z (Cmd+Z) annule le dernier trait
function surTouche(ev: KeyboardEvent) {
  if ((ev.ctrlKey || ev.metaKey) && ev.code === 'KeyZ' && !(ev.target instanceof HTMLInputElement)) {
    ev.preventDefault()
    store.annulerTrait()
  }
}
onMounted(() => window.addEventListener('keydown', surTouche))
onBeforeUnmount(() => window.removeEventListener('keydown', surTouche))
</script>

<template>
  <section class="panneau editeur" aria-labelledby="titre-editeur">
    <h2 id="titre-editeur">{{ t('creation.titre') }}</h2>
    <p class="aide">{{ t('creation.aide') }}</p>

    <fieldset class="outils">
      <legend>{{ t('creation.outils') }}</legend>
      <label v-for="o in OUTILS" :key="o" class="outil">
        <input v-model="store.outil" type="radio" name="outil" :value="o">
        <span class="pastille" :class="o" :style="{ background: COULEUR[o] }" aria-hidden="true" />
        <span class="texte">
          <span class="nom">{{ t(`creation.outil.${o}`) }}</span>
          <span class="description">{{ t(`creation.outil.${o}.aide`) }}</span>
        </span>
      </label>
    </fieldset>

    <p class="compte">
      <span>{{ t('creation.departs', { n: departs }) }}</span>
      <span>{{ t('creation.ennemis', { n: ennemis, max: MAX_ENNEMIS }) }}</span>
    </p>
    <ul v-if="store.problemes.length" class="problemes">
      <li v-for="p in store.problemes" :key="p">{{ t(`creation.probleme.${p}`) }}</li>
    </ul>

    <div class="boutons">
      <button type="button" :disabled="!store.historique.length" :title="t('creation.annuler-aide')" @click="store.annulerTrait()">{{ t('creation.annuler') }}</button>
      <button type="button" @click="store.carteDeZero()">{{ t('creation.zero') }}</button>
      <button type="button" :disabled="!store.salleDuJeu" :title="t('creation.depuis-salle-aide')" @click="store.carteDeLaSalle()">{{ t('creation.depuis-salle') }}</button>
    </div>
    <p class="aide">{{ t('creation.partage') }}</p>
    <button type="button" class="fin" :disabled="store.problemes.length > 0" @click="store.testerCarte()">{{ t('creation.tester') }}</button>
  </section>
</template>

<style scoped>
.editeur { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 10px; }
h2 { margin: 0; font-family: var(--police-titre); font-size: 20px; font-weight: 400; color: var(--or-clair); }
.aide { margin: 0; font-size: 12px; color: var(--texte-gris); line-height: 1.4; }
fieldset { margin: 0; padding: 0; border: 0; display: flex; flex-direction: column; gap: 6px; }
legend { padding: 0 0 6px; font-size: 13px; font-weight: 800; color: var(--texte-doux); }
.outil {
  position: relative;
  display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 10px; cursor: pointer;
  background: var(--fond-creux); border: 1px solid #263b41;
}
.outil:has(input:checked) { border-color: var(--or); background: #1d2a1f; }
.outil:has(input:focus-visible) { outline: 2px solid var(--or-clair); outline-offset: 2px; }
.outil input { position: absolute; opacity: 0; pointer-events: none; }
.pastille { width: 26px; height: 16px; flex: none; clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); }
/* Le vide n'a pas de couleur : un losange en pointillés */
.pastille.vide { clip-path: none; border: 1px dashed var(--texte-gris); border-radius: 3px; }
.texte { display: flex; flex-direction: column; }
.nom { font-size: 13px; font-weight: 800; }
.description { font-size: 11px; color: var(--texte-gris); }
.compte { margin: 0; display: flex; gap: 14px; font-size: 13px; font-weight: 700; color: var(--texte-doux); }
.problemes { margin: 0; padding-left: 18px; font-size: 12px; color: #ffd9cf; }
.boutons { display: flex; flex-wrap: wrap; gap: 8px; }
.boutons button { flex: 1 1 auto; height: 36px; padding: 0 12px; font-size: 13px; }
button.fin { width: 100%; margin-top: auto; }
</style>
