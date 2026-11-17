<script setup lang="ts">
import { langue, t } from '~/i18n'

/**
 * Coin du plateau en défi du jour, à la place du choix du mode : la date, le record du joueur
 * et le temps avant le prochain défi, et le top 3 du jour ; « Voir tout le classement » ouvre la
 * fenêtre avec tous les scores.
 */
const store = usePartieStore()
const fenetre = ref<HTMLDialogElement | null>(null)

const date = computed(() => new Intl.DateTimeFormat(langue.value, { day: 'numeric', month: 'long' })
  .format(new Date(`${store.jourDaily}T12:00:00`)))

/** Temps avant minuit, heure de Paris (mis à jour chaque minute). */
const maintenant = ref(Date.now())
let minuteur: ReturnType<typeof setInterval> | undefined
onMounted(() => (minuteur = setInterval(() => (maintenant.value = Date.now()), 60_000)))
onBeforeUnmount(() => clearInterval(minuteur))
const restant = computed(() => {
  const paris = new Date(new Date(maintenant.value).toLocaleString('en-US', { timeZone: 'Europe/Paris' }))
  const minutes = 24 * 60 - (paris.getHours() * 60 + paris.getMinutes())
  return { h: Math.floor(minutes / 60), min: minutes % 60 }
})
</script>

<template>
  <section class="panneau-daily" aria-labelledby="titre-daily">
    <h2 id="titre-daily">
      <span class="calendrier" aria-hidden="true" />
      {{ t('daily.titre') }}
      <span class="date">{{ date }}</span>
    </h2>
    <Classement :limite="3" class="top" />
    <button v-if="(store.classement?.lignes.length ?? 0) > 0" type="button" class="tout" @click="fenetre?.showModal()">{{ t('daily.voir-tout') }}</button>
    <p class="record">
      <template v-if="store.record && store.record.points > 0">{{ t('daily.ton-record', { n: store.record.points }) }}</template>
      <template v-else>{{ t('daily.pas-de-record') }}</template>
    </p>
    <p class="prochain">
      <span class="sablier" aria-hidden="true" />
      {{ t('daily.prochain', restant) }}
    </p>
    <dialog ref="fenetre" class="fenetre" aria-labelledby="titre-classement-complet">
      <h2 id="titre-classement-complet">{{ t('daily.classement') }} · {{ date }}</h2>
      <Classement />
      <button type="button" class="fermer" @click="fenetre?.close()">{{ t('reglages.fermer') }}</button>
    </dialog>
  </section>
</template>

<style scoped>
.panneau-daily {
  position: absolute; top: 12px; left: 12px; z-index: 3; width: 320px; padding: 10px 12px;
  display: flex; flex-direction: column; gap: 4px; border-radius: 10px;
  background: rgb(10 19 23 / 0.92); border: 1px solid var(--or);
}
h2 { margin: 0; display: flex; align-items: center; gap: 8px; font-family: var(--police-titre); font-size: 17px; font-weight: 400; color: var(--or-clair); }
.date { margin-left: auto; font-family: var(--police-texte); font-size: 12px; font-weight: 700; color: var(--texte-doux); }
p { margin: 0; display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--texte-doux); }
.top { margin: 4px 0; }
.tout {
  align-self: flex-start; height: auto; padding: 0; margin: -2px 0 4px; background: none; border: none;
  color: var(--or-clair); font-size: 12px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px;
}
.fenetre {
  border-radius: 16px; border: 1px solid var(--or); background: linear-gradient(#18292f, #132227);
  color: var(--texte); padding: 22px 26px; width: var(--largeur-fenetre); max-height: 90vh;
}
.fenetre::backdrop { background: rgb(5 10 12 / 0.75); }
.fenetre h2 { margin-bottom: 12px; font-size: 22px; }
.fenetre .fermer { width: 100%; margin-top: 16px; }
.record { font-weight: 800; color: var(--texte); }
.prochain { color: var(--texte-gris); }
/* Pictos blancs du jeu, colorés par masque */
.calendrier, .sablier { flex: none; background: currentColor; }
.calendrier { width: 18px; height: 18px; color: var(--or); mask: url('/icones/calendrier.png') center / contain no-repeat; -webkit-mask: url('/icones/calendrier.png') center / contain no-repeat; }
.sablier { width: 14px; height: 14px; mask: url('/icones/sablier.png') center / contain no-repeat; -webkit-mask: url('/icones/sablier.png') center / contain no-repeat; }
</style>
