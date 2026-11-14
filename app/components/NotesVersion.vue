<script setup lang="ts">
import { langue, t } from '~/i18n'
import { NOTES } from '~/i18n/notes'

/** Notes de version (app/i18n/notes.ts), ouvertes depuis les réglages. */
const dialogue = ref<HTMLDialogElement | null>(null)

const notes = computed(() => NOTES[langue.value])
const formatDate = (iso: string) => new Intl.DateTimeFormat(langue.value, { day: 'numeric', month: 'long', year: 'numeric' })
  .format(new Date(`${iso}T12:00:00`))

function ouvrir() {
  dialogue.value?.showModal()
  if (dialogue.value) dialogue.value.scrollTop = 0
}

defineExpose({ ouvrir })
</script>

<template>
  <dialog ref="dialogue" class="notes" aria-labelledby="titre-notes">
    <h2 id="titre-notes">{{ t('notes.titre') }}</h2>
    <article v-for="n in notes" :key="n.date">
      <h3><time :datetime="n.date">{{ formatDate(n.date) }}</time></h3>
      <template v-if="n.nouveautes.length">
        <h4>{{ t('notes.nouveautes') }}</h4>
        <ul>
          <li v-for="(x, k) in n.nouveautes" :key="k">{{ x }}</li>
        </ul>
      </template>
      <template v-if="n.corrections.length">
        <h4>{{ t('notes.corrections') }}</h4>
        <ul>
          <li v-for="(x, k) in n.corrections" :key="k">{{ x }}</li>
        </ul>
      </template>
    </article>
    <button type="button" class="fin" @click="dialogue?.close()">{{ t('reglages.fermer') }}</button>
  </dialog>
</template>

<style scoped>
.notes {
  border-radius: 16px; border: 1px solid var(--or); background: linear-gradient(#18292f, #132227);
  color: var(--texte); padding: 22px 26px; width: var(--largeur-fenetre); max-height: 90vh;
  font-size: 14px; line-height: 1.5;
}
/* Ouverte par-dessus les réglages, qui assombrissent déjà le fond : pas de second voile */
.notes::backdrop { background: transparent; }
h2 { margin: 0 0 14px; font-family: var(--police-titre); font-size: 24px; font-weight: 400; color: var(--or-clair); }
article { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #263b41; }
h3 { margin: 0 0 6px; font-size: 15px; font-weight: 800; color: var(--or-clair); }
h4 { margin: 8px 0 4px; font-size: 13px; font-weight: 800; color: var(--texte); }
ul { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; color: var(--texte-doux); }
.fin { width: 100%; }
</style>
