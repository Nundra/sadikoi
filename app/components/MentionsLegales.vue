<script setup lang="ts">
import { t } from '~/i18n'

/**
 * Mentions légales, données personnelles et crédits (Ankama). Ouvertes depuis les réglages,
 * la bienvenue et l'écran petit format, par-dessus la fenêtre qui les ouvre (pas de second voile).
 * Identité de l'éditeur : EDITEUR, à compléter avant la mise en ligne.
 */
const EDITEUR = {
  nom: '[Prénom Nom]',
  siret: '[SIRET]',
  adresse: '[adresse]',
}

const dialogue = ref<HTMLDialogElement | null>(null)

function ouvrir() {
  dialogue.value?.showModal()
  if (dialogue.value) dialogue.value.scrollTop = 0
}

defineExpose({ ouvrir })
</script>

<template>
  <dialog ref="dialogue" class="mentions" aria-labelledby="titre-mentions">
    <h2 id="titre-mentions">{{ t('legal.titre') }}</h2>

    <section>
      <h3>{{ t('legal.editeur') }}</h3>
      <p>{{ t('legal.editeur-texte', EDITEUR) }}</p>
      <p>{{ t('legal.directeur', EDITEUR) }}</p>
      <p>{{ t('legal.contact') }}</p>
    </section>

    <section>
      <h3>{{ t('legal.hebergeur') }}</h3>
      <p>{{ t('legal.hebergeur-texte') }}</p>
    </section>

    <section>
      <h3>{{ t('legal.ankama') }}</h3>
      <p>{{ t('legal.ankama-texte') }}</p>
      <p>{{ t('legal.ankama-retrait') }}</p>
    </section>

    <section>
      <h3>{{ t('legal.donnees') }}</h3>
      <p>{{ t('legal.donnees-texte') }}</p>
      <p>{{ t('legal.donnees-stockage') }}</p>
      <p>{{ t('legal.donnees-hebergeur') }}</p>
    </section>

    <section>
      <h3>{{ t('legal.credits') }}</h3>
      <p>{{ t('legal.credits-texte', EDITEUR) }}</p>
    </section>

    <button type="button" class="fin" @click="dialogue?.close()">{{ t('reglages.fermer') }}</button>
  </dialog>
</template>

<style scoped>
.mentions {
  border-radius: 16px; border: 1px solid var(--or); background: linear-gradient(#18292f, #132227);
  color: var(--texte); padding: 22px 26px; width: var(--largeur-fenetre); max-height: 90vh;
  font-size: 13px; line-height: 1.5; text-align: left;
}
/* Ouverte par-dessus une autre fenêtre, qui assombrit déjà le fond : pas de second voile */
.mentions::backdrop { background: transparent; }
h2 { margin: 0 0 14px; font-family: var(--police-titre); font-size: 24px; font-weight: 400; color: var(--or-clair); }
section { margin-bottom: 14px; }
h3 { margin: 0 0 4px; font-size: 14px; font-weight: 800; color: var(--or-clair); }
p { margin: 0 0 6px; color: var(--texte-doux); }
.fin { width: 100%; }
</style>
