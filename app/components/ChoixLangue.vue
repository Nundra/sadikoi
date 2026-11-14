<script setup lang="ts">
import { LANGUES, choisirLangue, langue, retenirLangue, t, type Langue } from '~/i18n'

/**
 * Choix de la langue : français (/), anglais (/en), espagnol (/es). Un bouton au drapeau de la
 * langue en cours (même taille que les boutons à icône du bandeau) ouvre la liste des langues.
 * Drapeaux dessinés en SVG : les émojis drapeaux ne s'affichent pas sous Windows.
 * `enLigne` (réglages) : les trois langues côte à côte, sans menu.
 */
const props = defineProps<{ enLigne?: boolean }>()
const ouvert = ref(false)
const racine = ref<HTMLElement | null>(null)
const bouton = ref<HTMLButtonElement | null>(null)
const id = useId()

const nomLangue = computed(() => LANGUES.find(l => l.id === langue.value)!.nom)

async function choisir(l: Langue) {
  ouvert.value = false
  bouton.value?.focus()
  retenirLangue(l)
  if (l !== langue.value) await choisirLangue(l)
}

function surTouche(ev: KeyboardEvent) {
  if (ev.key !== 'Escape' || !ouvert.value) return
  ev.stopPropagation()
  ouvert.value = false
  bouton.value?.focus()
}

// Clic en dehors : on referme
function clicDehors(ev: MouseEvent) {
  if (ouvert.value && racine.value && !racine.value.contains(ev.target as Node)) ouvert.value = false
}
onMounted(() => document.addEventListener('mousedown', clicDehors))
onBeforeUnmount(() => document.removeEventListener('mousedown', clicDehors))
</script>

<template>
  <div ref="racine" class="choix-langue" :class="{ 'en-ligne': props.enLigne }" @keydown="surTouche">
    <button
      v-if="!props.enLigne"
      ref="bouton"
      type="button"
      class="courant"
      :aria-label="`${t('langue.choisir')} : ${nomLangue}`"
      :title="nomLangue"
      :aria-expanded="ouvert"
      :aria-controls="id"
      @click="ouvert = !ouvert"
    >
      <Drapeau :langue="langue" />
    </button>
    <ul v-show="ouvert || props.enLigne" :id="id" class="liste">
      <li v-for="l in LANGUES" :key="l.id">
        <button type="button" :lang="l.id" :aria-current="l.id === langue ? 'true' : undefined" @click="choisir(l.id)">
          <Drapeau :langue="l.id" />
          <span>{{ l.nom }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.choix-langue { position: relative; }
.courant { width: 44px; padding: 0; display: flex; align-items: center; justify-content: center; }
.courant :deep(svg) { width: 26px; }
.liste {
  position: absolute; top: calc(100% + 4px); right: 0; z-index: 10; margin: 0; padding: 4px; list-style: none;
  display: flex; flex-direction: column; gap: 2px; min-width: 150px;
  border-radius: 10px; background: #0b1418; border: 1px solid var(--or); box-shadow: 0 8px 20px rgb(0 0 0 / 0.6);
}
.liste button {
  width: 100%; height: 36px; padding: 0 10px; display: flex; align-items: center; gap: 10px;
  background: none; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; text-align: left;
}
.liste button:hover { background: #22363c; }
.liste button[aria-current] { color: var(--or-clair); }
.liste :deep(svg) { width: 22px; flex: none; }
.en-ligne .liste { position: static; flex-direction: row; gap: 8px; padding: 0; border: none; background: none; box-shadow: none; }
.en-ligne .liste button { width: auto; height: 40px; padding: 0 14px; background: var(--fond-creux); border: 1px solid var(--bord-clair); }
.en-ligne .liste button[aria-current] { border-color: var(--or); }
</style>
