<script setup lang="ts">
import { t } from '~/i18n'

/**
 * Classement du défi du jour (anonyme) : trophée or, argent, bronze pour les trois premiers,
 * points, étoiles, et « vous » sur nos lignes. `limite` : 3 dans le coin du plateau, 5 à la fin.
 */
const props = defineProps<{ limite: number }>()
const store = usePartieStore()

const lignes = computed(() => (store.classement ?? []).slice(0, props.limite))
const COULEURS = ['#f2c14e', '#c9d3d6', '#cd8a52']
</script>

<template>
  <div class="classement">
    <p v-if="store.defiPerime" class="etat">{{ t('daily.perime') }}</p>
    <p v-if="store.classement === null" class="etat">{{ store.classementIndisponible ? t('daily.classement-indisponible') : t('daily.classement-chargement') }}</p>
    <p v-else-if="!lignes.length" class="etat">{{ t('daily.classement-vide') }}</p>
    <ol v-else>
      <li v-for="(e, k) in lignes" :key="e.id" :class="{ moi: store.estMoi(e) }">
        <span v-if="k < 3" class="trophee" :style="{ background: COULEURS[k] }" role="img" :aria-label="t('daily.place', { n: k + 1 })" />
        <span v-else class="rang">{{ t('daily.place', { n: k + 1 }) }}</span>
        <strong class="points">{{ t('daily.points', { n: e.points }) }}</strong>
        <Etoiles :nombre="e.etoiles" />
        <span v-if="store.estMoi(e)" class="vous">{{ t('daily.vous') }}</span>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.etat { margin: 0; font-size: 12px; color: var(--texte-gris); }
ol { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
li { display: flex; align-items: center; gap: 8px; padding: 3px 6px; border-radius: 6px; font-size: 13px; }
li.moi { background: rgb(224 178 90 / 0.15); outline: 1px solid var(--or); }
.trophee, .rang { flex: none; width: 20px; height: 20px; }
/* Trophée blanc du jeu, coloré par masque (couleur par style : Firefox) */
.trophee { mask: url('/icones/trophee.png') center / contain no-repeat; -webkit-mask: url('/icones/trophee.png') center / contain no-repeat; }
.rang { display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: var(--texte-gris); }
.points { min-width: 64px; color: var(--or-clair); font-weight: 800; }
.vous { margin-left: auto; padding: 0 6px; border-radius: 999px; background: var(--or); color: #2a1d08; font-size: 11px; font-weight: 800; }
li :deep(.etoile) { width: 14px; height: 14px; }
</style>
