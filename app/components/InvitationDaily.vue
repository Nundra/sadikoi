<script setup lang="ts">
import { adresse, pageDuChemin, t } from '~/i18n'

/**
 * Invitation au défi du jour, à l'arrivée sur le jeu (pas sur /daily) tant que le défi n'est pas
 * fait aujourd'hui : après la bienvenue et la nouveauté (le bandeau appelle `ouvrirSiAFaire`
 * quand elles sont fermées ou qu'il n'y a rien à montrer). Une fois par chargement de page.
 */
const store = usePartieStore()
const dialogue = ref<HTMLDialogElement | null>(null)
let montree = false

function ouvrirSiAFaire() {
  if (montree || pageDuChemin(window.location.pathname) === 'daily' || store.dailyFait) return
  montree = true
  dialogue.value?.showModal()
}

defineExpose({ ouvrirSiAFaire })
</script>

<template>
  <dialog ref="dialogue" class="invitation" aria-labelledby="titre-invitation">
    <span class="trophee" aria-hidden="true" />
    <h2 id="titre-invitation">{{ t('daily.invitation-titre') }}</h2>
    <p>{{ t('daily.invitation-texte') }}</p>
    <div class="boutons">
      <button type="button" @click="dialogue?.close()">{{ t('daily.plus-tard') }}</button>
      <a class="fin" :href="adresse('daily')">{{ t('daily.relever') }}</a>
    </div>
  </dialog>
</template>

<style scoped>
.invitation {
  border-radius: 16px; border: 1px solid var(--or); background: linear-gradient(#18292f, #132227);
  color: var(--texte); padding: 24px 28px; width: var(--largeur-fenetre); text-align: center;
  font-size: 14px; line-height: 1.5;
}
.invitation::backdrop { background: rgb(5 10 12 / 0.75); }
.trophee {
  display: block; width: 48px; height: 48px; margin: 0 auto 8px; background: var(--or);
  mask: url('/icones/trophee.png') center / contain no-repeat; -webkit-mask: url('/icones/trophee.png') center / contain no-repeat;
}
h2 { margin: 0 0 10px; font-family: var(--police-titre); font-size: 24px; font-weight: 400; color: var(--or-clair); }
p { margin: 0 0 10px; color: var(--texte-doux); }
.boutons { display: flex; gap: 10px; margin-top: 16px; }
.boutons > * { flex: 1; }
/* Lien qui navigue, dessiné comme le bouton doré de fin */
a.fin {
  display: flex; align-items: center; justify-content: center; height: 44px; border-radius: 10px;
  background: linear-gradient(#e7bf68, #c9963c); color: #2a1d08; font-weight: 800; text-decoration: none;
}
</style>
