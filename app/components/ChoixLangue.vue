<script setup lang="ts">
import { LANGUES, choisirLangue, langue, t, type Langue } from '~/i18n'

/** Choix de la langue : français (/), anglais (/en), espagnol (/es). */
const id = useId()
</script>

<template>
  <span class="choix-langue">
    <label class="sr-only" :for="id">{{ t('langue.choisir') }}</label>
    <select :id="id" :value="langue" @change="choisirLangue(($event.target as HTMLSelectElement).value as Langue)">
      <option v-for="l in LANGUES" :key="l.id" :value="l.id" :lang="l.id">{{ l.nom }}</option>
    </select>
  </span>
</template>

<style scoped>
select {
  height: 36px; padding: 0 8px; border-radius: 8px; background: var(--fond-creux);
  color: var(--texte); border: 1px solid var(--bord-clair); font: inherit; font-size: 13px; font-weight: 700;
}
select:hover { border-color: var(--or); }
</style>
