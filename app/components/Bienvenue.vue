<script setup lang="ts">
import { POINTS_PAR_PA, POINTS_TOUR_2 } from '~~/engine/partie'
import { ETOILES_POUR_AVANCER } from '~/stores/partie'

/**
 * Présentation de l'app : ouverte d'office à la première visite (sadikoi:bienvenue),
 * puis à la demande avec le bouton d'aide du bandeau.
 */
const dialogue = ref<HTMLDialogElement | null>(null)

function ouvrir() {
  dialogue.value?.showModal()
  // Le focus va sur « C'est parti », en bas : on garde la fenêtre affichée depuis le haut
  if (dialogue.value) dialogue.value.scrollTop = 0
}

function fermer() {
  try {
    localStorage.setItem('sadikoi:bienvenue', 'vue')
  } catch {
    // stockage indisponible : la fenêtre s'ouvrira de nouveau à la prochaine visite
  }
  dialogue.value?.close()
}

onMounted(() => {
  let dejaVue = false
  try {
    dejaVue = localStorage.getItem('sadikoi:bienvenue') === 'vue'
  } catch {
    // stockage indisponible : on l'affiche
  }
  if (!dejaVue) ouvrir()
})

defineExpose({ ouvrir })
</script>

<template>
  <dialog ref="dialogue" class="bienvenue" aria-labelledby="titre-bienvenue" @close="fermer">
    <img src="/logo.png" alt="" class="logo">
    <h2 id="titre-bienvenue">Bienvenue dans la salle d’entraînement du Sadida</h2>
    <p class="accroche">
      Le but : <strong>infecter tous les ennemis dès le tour 1</strong>. Pas de dégâts, pas d’IA ennemie :
      seul compte l’état Infecté, en placement libre comme en combat.
    </p>

    <section>
      <h3>Comment jouer</h3>
      <ol>
        <li><strong>Place-toi</strong> sur une case bleue, choisis tes variantes (et la Prycipithon Mate si tu veux +2 PA), puis valide le placement. Le Sadida a 12 PA, 6 PM et 6 PO.</li>
        <li><strong>Choisis un sort</strong> dans la barre (clic ou touche du clavier), puis une case : seules les cases visables s’allument. Sans sort choisi, clique une case verte pour te déplacer.</li>
        <li><strong>« Fin du tour »</strong> passe la main à tes invocations, de la dernière invoquée à la première, comme en jeu : elles jouent chacune leur tour (La Folle, La Sacrifiée, le Groute…).</li>
        <li>Chaque action va dans la <strong>timeline</strong> : clique-la pour revoir le plateau à ce moment, et « Annuler » pour la défaire.</li>
      </ol>
    </section>

    <section>
      <h3>Le score</h3>
      <ul>
        <li><strong>1, 2, 3 étoiles</strong> : 50 %, 75 %, 100 % des ennemis infectés à la fin du tour.</li>
        <li><strong>4ᵉ étoile</strong> : tous les ennemis sont <em>encore</em> infectés au tour 2 (Infection de 2 tours ou plus, posée par une invocation, Cigüe, Mandragore…). C’est le vrai défi en solo.</li>
        <li><strong>Points</strong> pour départager : 100 × la part infectée, +{{ POINTS_PAR_PA }} par PA du Sadida économisé si tout le monde est infecté, +{{ POINTS_TOUR_2 }} avec la 4ᵉ étoile, −10 % avec la Prycipithon Mate. Ton record est gardé pour chaque salle.</li>
      </ul>
    </section>

    <section>
      <h3>Les modes</h3>
      <ul>
        <li><strong>Mode infini</strong> : une run de salles tirées au hasard. Il faut {{ ETOILES_POUR_AVANCER }} étoiles pour passer à la suivante.</li>
        <li><strong>Training</strong> : choisis une map précise, ou une salle de boss.</li>
        <li><strong>Partager</strong> copie le lien de la salle : tes amis jouent exactement la même.</li>
        <li>Dans les <strong>réglages</strong> : ton personnage, les types de map tirés, les touches de la barre (et fais glisser les sorts pour les réorganiser).</li>
      </ul>
    </section>

    <p class="note">
      Les règles sont simplifiées (tacle : on ne quitte jamais le contact d’un ennemi) et certains sorts sont
      interprétés d’après leur description. Si quelque chose ne colle pas avec le jeu, dis-le !
    </p>

    <button type="button" class="fin" @click="fermer">C’est parti</button>
  </dialog>
</template>

<style scoped>
.bienvenue {
  border-radius: 16px; border: 1px solid var(--or); background: linear-gradient(#18292f, #132227);
  color: var(--texte); padding: 22px 28px; width: min(640px, 92vw); max-height: 90vh;
  font-size: 14px; line-height: 1.5;
}
.bienvenue::backdrop { background: rgb(5 10 12 / 0.75); }
.logo { display: block; height: 72px; width: auto; margin: 0 auto 8px; }
h2 { margin: 0 0 8px; font-family: var(--police-titre); font-size: 24px; font-weight: 400; color: var(--or-clair); text-align: center; }
.accroche { margin: 0 0 14px; text-align: center; color: var(--texte-doux); }
section { margin-bottom: 12px; }
h3 { margin: 0 0 4px; font-size: 15px; font-weight: 800; color: var(--or-clair); }
ol, ul { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; color: var(--texte-doux); }
strong { color: var(--texte); }
.note { margin: 4px 0 16px; padding: 8px 12px; border-radius: 8px; background: var(--fond-creux); border: 1px solid #263b41; font-size: 12px; color: var(--texte-gris); }
.fin { width: 100%; }
</style>
