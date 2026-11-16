<script setup lang="ts">
import { choisirLangue, langue, prefixe, t } from '~/i18n'

/**
 * Page des mentions légales, données personnelles et crédits (Ankama), servie sur /legals
 * (/en/legals, /es/legals). Projet personnel et non commercial : édité à titre individuel,
 * hors de la micro-entreprise de l'éditeur (pas de SIRET ni d'adresse à afficher).
 */
const EDITEUR = {
  nom: 'Jérémie Cieslarczyk',
  contact: 'contact@jeremie-cieslarczyk.fr',
}

onMounted(() => choisirLangue(langue.value))
</script>

<template>
  <div class="page">
    <header>
      <a :href="prefixe(langue) || '/'" class="logo"><img src="/logo.png" :alt="t('legal.retour')"></a>
      <ChoixLangue />
    </header>

    <main>
      <h1>{{ t('legal.titre') }}</h1>

      <section>
        <h2>{{ t('legal.editeur') }}</h2>
        <p>{{ t('legal.editeur-texte', EDITEUR) }}</p>
        <p>{{ t('legal.directeur', EDITEUR) }}</p>
        <p>{{ t('legal.contact') }} <a :href="`mailto:${EDITEUR.contact}`">{{ EDITEUR.contact }}</a></p>
      </section>

      <section>
        <h2>{{ t('legal.hebergeur') }}</h2>
        <p>{{ t('legal.hebergeur-texte') }}</p>
      </section>

      <section>
        <h2>{{ t('legal.ankama') }}</h2>
        <p>{{ t('legal.ankama-texte') }}</p>
        <p>{{ t('legal.ankama-retrait') }}</p>
      </section>

      <section>
        <h2>{{ t('legal.donnees') }}</h2>
        <p>{{ t('legal.donnees-texte') }}</p>
        <p>{{ t('legal.donnees-stockage') }}</p>
        <p>{{ t('legal.donnees-daily') }}</p>
        <p>{{ t('legal.donnees-hebergeur') }}</p>
      </section>

      <section>
        <h2>{{ t('legal.credits') }}</h2>
        <p>{{ t('legal.credits-texte', EDITEUR) }}</p>
      </section>

      <a :href="prefixe(langue) || '/'" class="retour">{{ t('legal.retour') }}</a>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh; padding: 20px 16px 40px;
  background: radial-gradient(120% 90% at 40% 20%, #16303a 0%, #0e1c22 55%, #0a1317 100%);
}
header { max-width: 760px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.logo img { display: block; height: 56px; width: auto; }
main {
  max-width: 760px; margin: 0 auto; padding: 26px 30px; border-radius: 16px;
  border: 1px solid var(--or); background: linear-gradient(#18292f, #132227);
  font-size: 14px; line-height: 1.6;
}
h1 { margin: 0 0 18px; font-family: var(--police-titre); font-size: 30px; font-weight: 400; color: var(--or-clair); }
section { margin-bottom: 18px; }
h2 { margin: 0 0 6px; font-size: 16px; font-weight: 800; color: var(--or-clair); }
p { margin: 0 0 8px; color: var(--texte-doux); }
p a, .retour { color: var(--or-clair); font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
.retour { display: inline-block; margin-top: 6px; }
</style>
