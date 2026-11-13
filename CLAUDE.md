# Sadikoi

Projet hors PAM (projet perso)

Application web d'entraînement pour le Sadida de Dofus 3 : une « salle d'entraînement » où l'on s'exerce à **infecter tous les ennemis au tour 1** (T1), en placement libre comme en combat réel.

## Objectif et score

- Une salle = une map, des ennemis placés sur leurs cases de départ, le Sadida en placement libre sur les cases de son équipe.
- On joue un seul tour (le T1 du Sadida, puis celui de ses invocations). Pas de dégâts, pas d'IA ennemie : seul compte l'état **Infecté**.
- Score = part des ennemis infectés à la fin du tour :
  - 100 % → 3 étoiles
  - ≥ 75 % → 2 étoiles
  - ≥ 50 % → 1 étoile
  - < 50 % → échec
  - **4e étoile** : tous les ennemis sont **encore infectés au tour 2** (le jeu solo vise une infection qui tient, une team à 2 Sadida se contente du T1). Un effet expire au début du tour de celui qui l'a lancé : un ennemi tient au tour 2 du Sadida si son Infection vient du Sadida et dure au moins 2 tours, si elle vient d'une invocation (même 1 tour : l'invocation joue après le Sadida), ou s'il est sous Mandragore (qui le réinfecte). Le moteur garde l'Infection qui expire le plus tard (`finInfection`).
- **Durée d'infection** : celle du sort, lue dans `data/sorts.json` (1 tour : Vent Empoisonné, Ronce, Miasmes, Agacement, Mandragore ; 2 tours : Contagion, Sacrifice Vaudou, Explosion Ouatée, Rejet et Étreinte Sylvestre ; 3 tours : Sève Paralysante, Cigüe). Réinfecter garde la plus longue durée. Cigüe porte l'Infection de la cible Infectée à 3 tours (ou celle des Infectés en cercle de 2 autour d'un Arbre Feuillu). Mandragore sur un Infecté (exploitation) pose l'état Mandragore sur tous les Infectés. Ronce Insolente réduit d'un tour (sur tous les Infectés si elle exploite) : une Infection qui tombe à 0 disparaît.
- **Points** (pour départager à étoiles égales) : 100 × la part d'ennemis infectés, plus 10 points par PA du Sadida non dépensé si tous sont infectés, plus 50 avec la 4e étoile ; × 0,9 avec la Prycipithon Mate. Les PA des invocations ne comptent pas (les invoquer coûte déjà des PA au Sadida). Pas de référence « coup parfait » : le calculer demanderait d'explorer toutes les combinaisons, trop lourd pour chaque salle.
- **Record par salle** : même map, mêmes ennemis, mêmes caractéristiques. Gardé dans le navigateur (`sadikoi:records`, 300 salles au plus).

## Modes

**V1**
- **Mode infini** (écran d'arrivée, aucune étape avant) : une run, c'est-à-dire un enchaînement de salles. On ne passe à la salle suivante qu'avec 3 étoiles au moins ; sinon on recommence la run, ou on rejoue la salle, ce qui passe en training sur cette salle (mêmes ennemis) et termine la run (« Nouvelle run » dans le bandeau). Record de la plus longue run gardé dans `sadikoi:run`. Salles tirées au hasard parmi les types de map cochés dans les réglages (par défaut : zones normales, donjons et Songes ; pas de zones spéciales, de Kolizéum ni de maps à part).
- **Training map spécifique** : le joueur choisit une map dans un sélecteur. En training, la fenêtre de fin propose de retravailler la salle (« Rejouer la salle » avec le même placement, ou « Recommencer du placement »), pas de salle suivante.
- **Training map de boss** : même chose, limité aux maps de boss.

**Partage** : chaque salle a un code court (`codeSalle` dans `engine/salle.ts` : map en base 36, puis 3 caractères par ennemi, case et monstre dessiné), gardé dans l'URL (`?salle=…`) en training (map ou boss) pour qu'un rechargement redonne la même salle, et retiré en mode infini pour qu'un rechargement relance un tirage. Le bouton « Partager » copie ce lien ; l'ouvrir charge la même salle en mode « map spécifique ».

**V2 (plus tard, ne pas faire maintenant)** : comptes utilisateurs, maps custom, défi quotidien.

## Règles du moteur

- **Niveau et stats du Sadida** : réglables dans les Réglages (`sadikoi:personnage`), par défaut niveau 200 et 12 PA / 6 PM / 6 PO. Bornes : niveau 1 à 200, PA 6 à 12, PM 3 à 6, PO 0 à 6 (`LIMITES_STATS` dans `app/stores/partie.ts`). Le niveau débloque les sorts : un sort (ou une variante) au-dessus du niveau est grisé dans la barre et ne se joue pas ; un sort débloqué prend la PA et la PO de son rang (`rangs` dans `data/sorts.json`, `sortAuNiveau` dans `engine/sorts.ts`), ses effets restent ceux du dernier rang, et les invocations gardent leurs caractéristiques et sorts du dernier rang. Niveau et stats sont verrouillés pendant le tour. Le record d'une salle dépend aussi des stats et du niveau. Option **Prycipithon Mate** (case au-dessus des caractéristiques) : +2 PA au tour 1, en échange des points × 0,9 (les étoiles ne changent pas). Verrouillée pendant le tour, comme les variantes.
- **Variantes** : chaque sort a une variante (paires du jeu). Le joueur choisit l'une ou l'autre, jamais les deux. Variantes et Prycipithon se règlent pendant le placement et sont verrouillées une fois le placement validé (« Replacer » les déverrouille).
- **Timeline action par action** : le tour se construit comme une suite d'actions, par exemple « Arbre Feuillu → case X », « La Sacrifiée → sur l'Arbre », « Sacrifiée : déplacement → case Y », « Sacrifiée : explosion ». Chaque action est vérifiée (PA/PM restants, PO, ligne de vue, case libre, limites de lancer), affiche ce qu'elle change (ennemis infectés, ressources restantes) et peut être annulée.
- **Placement** : la salle commence par le placement du Sadida sur une de ses cases (bleues à l'écran), à valider avant le tour. Dans les données, le joueur part des cases rouges et les ennemis des bleues, sur toutes les maps.
- **Ordre réel du jeu** : d'abord tout le tour du Sadida, puis chaque invocation joue son propre tour, de la dernière invoquée à la première (comme en jeu). Le Sadida ne rejoue pas entre deux actions d'une invocation. « Fin du tour » passe la main à l'invocation suivante (c'est une action de la timeline, qu'on peut annuler) ; après la dernière, la salle est terminée. On ne choisit pas qui joue en cliquant.
- **Les invocations comptent** pour le score.
  - **La Sacrifiée** (6 PA / 4 PM) : si un ennemi est au contact ou atteignable en 4 PM ou moins, elle explose et infecte tous les ennemis en cercle de 2 autour d'elle. Le joueur choisit la case d'explosion.
  - **La Folle** (6 PA / 5 PM) : le joueur la déplace, puis choisit ses cibles à portée d'Agacement (3 PA, PO 1-4, 1 lancer par cible) : jusqu'à 2 ennemis par tour.
  - **Groute** (Rejet Sylvestre, PO 2-8) et **Tréant** (Étreinte Sylvestre, PO 1-8), 4 PA / 4 PM : même logique que La Folle, à confirmer.
- **État Infecté (jeu)** : quand un ennemi Infecté est ciblé par un sort éligible, tous les Infectés subissent ce sort. Exploitation limitée à 3 fois par tour. Un sort qui « exploite » ne crée pas de nouvel Infecté.
- **Arbre vs Arbre Feuillu** : un Arbre normal ne devient Feuillu qu'au tour suivant. Au T1, les zones autour des Arbres ne marchent qu'avec Arbre Feuillu, Larme de Sadida, Montée de Sève ou Mangrove.
- **Grille** : 14 colonnes × 40 rangées en quinconce (560 cases). Distance entre deux cases : passer en coordonnées losange (`x = 2c + (r % 2) + 1`, `y = r + 1`, `i = (x + y) / 2`, `j = (x - y) / 2`), puis `|Δi| + |Δj|`.

## Données

- `data/sorts.json` : les 44 sorts du Sadida (22 paires) et ses invocations, au niveau max. Pour chaque sort : PA, PO, PO modifiable, ligne de vue, lancer en ligne, limites, relance, relance initiale (Rempotage, Arbre de Vie et La Fourbe ne se lancent pas au T1), rangs (niveau du joueur qui débloque chaque rang, PA et PO du rang), description officielle, effets bruts (action, cibles, zone, durée, état posé), plus le rôle dans l'infection.
- `data/infection-roles.json` : rôle de chaque sort pour l'infection (Applique, Applique (zone), Propage, Maintient, Exploite, Invocation, Support, Conditionnel, Consomme, Aucun), écrit à la main d'après les effets. **C'est notre interprétation** : à corriger ici si un test en jeu la contredit.
- `scripts/extract-sorts.py` : régénère `data/sorts.json` après un patch. Il prend en entrée `dofus.sqlite` et `i18n_fr.json` de la dernière release de [dofus-sqlite](https://github.com/ledouxm/dofus-sqlite).
- `data/maps.json` : les 3 830 maps de combat (celles qui ont des cases de placement rouges et bleues). Pour chaque map : id, nom, zone, sous-zone, position, donjon et boss s'il y en a, et `cases` : 560 lettres dans l'ordre des cases (`_` marchable, `r` / `b` placement rouge / bleu, `x` marchable mais bloque la LdV, `#` obstacle, `.` vide qui ne bloque pas la LdV).
- `scripts/extract-maps.py` : régénère `data/maps.json` (`uv run scripts/extract-maps.py <dossier dofus-sqlite> [<Dofus_Data>]`). Le `maps.sqlite` de dofus-sqlite ne contient que les objets interactifs : les cases sont lues dans les bundles Unity du client Dofus 3 installé (`StreamingAssets/Content/Map/Data`), les noms et donjons dans `dofus.sqlite`.
- `scripts/extract-icones.py` : régénère `public/sorts/` (depuis `images-spell.zip` de la release dofus-sqlite, via `SpellData.iconId`), `public/portraits/` (`images-class.zip` et `images-monster.zip`, nommées par `MonsterData.gfxId`) et `public/icones/` (depuis les bundles `aa/StandaloneLinux64` du client). `uv run scripts/extract-icones.py <dossier dofus-sqlite> [<Dofus_Data>]`.
- `data/salles-boss.json` : la salle du boss d'un donjon n'est pas dans les données du jeu. Le script la déduit du nom des salles et liste celles à vérifier. On corrige ici, à la main : `{"<id du donjon>": {"map": <id de la map>}}`.
- `data/traductions/en.json`, `es.json` : textes officiels du jeu en anglais et en espagnol (noms et descriptions des sorts, noms des invocations, et une table « nom français → traduction » pour les maps, sous-zones, zones, donjons, boss et monstres dessinés). Régénérés par `python3 scripts/extract-traductions.py <dossier dofus-sqlite>` (`dofus.sqlite`, `i18n_fr.json`, `i18n_en.json`, `i18n_es.json`), à relancer après `extract-sorts.py` ou `extract-maps.py`.
- **Points à vérifier en jeu** : la zone de propagation de Contagion (cercle de 2 autour de la cible, déduit de la description) ; la ligne de vue quand elle passe exactement par un coin (voir `engine/ldv.ts`) ; Inoculation : les données du jeu retirent l'Infection de tous les Infectés de la map, `infection-roles.json` dit « autour de la cible » (le moteur suit les données) ; Explosion Ouatée : La Sacrifiée la lance sur elle-même (« Sur la Sacrifiée : applique les effets… »), il lui faut un ennemi au contact ; Mandragore compte comme « encore infecté au T2 » (sa réinfection demande des dommages de poison ou d'invocation au T2) ; Ronce Insolente : réduction d'un tour qui peut retirer une Infection d'un tour ; Tremblement : il faut viser le lanceur, un Arbre Feuillu ou une Poupée, et seule l'attirance autour de ce centre est jouée (les Arbres ne bougent pas, les entités au contact non plus) ; Rejet Sylvestre et Étreinte Sylvestre : lecture de « jusqu'à la case ciblée » (voir `COMPORTEMENTS`) ; direction d'une attirance ou d'une poussée hors ligne : la plus proche des 8 directions à l'écran (`engine/mouvements.ts`).

## Style

- Esprit Dofus 3 : fond bleu-vert sombre, panneaux arrondis, touches dorées (`#e0b25a` / `#f0cd85`), plateau herbeux en losanges, polices Marcellus (titres) et Nunito Sans (texte).
- **Assets du jeu autorisés** (décision de Jérémie du 2026-11-13, qui lève l'ancienne règle « aucun asset Ankama ») : icônes de sorts et pictos d'interface extraits du jeu, déployés avec le site.
- Icônes de sorts : `public/sorts/<id du sort>.png` (ex : `public/sorts/13562.png` pour Miasmes). Pictos d'interface : `public/icones/` (`pa`, `pm`, `po`, et `etoile-pleine`, `etoile-vide`, `reglages`, `variante` (flèches « exchange » du bouton ⇄), `aide` (point d'interrogation), `prycipithon` (icône de l'objet, `Content/Picto/Items` du client), pictos blancs du jeu colorés par masque CSS). Portraits : `public/portraits/` (`sadida-femme.png` et `sadida-homme.png` = Sadida en pied, pose de repos 0, au choix dans les Réglages, femme par défaut, `sadikoi:apparence` ; et `<id du monstre>.png` pour les ennemis et invocations de `data/portraits.json`). Chaque ennemi d'une salle prend un monstre emblématique au hasard dans cette liste (visuel seulement, la timeline affiche son nom). Tout vient de `scripts/extract-icones.py`.
- Logo : fourni par Jérémie (originaux sur fond blanc dans `docs/logo/`). `scripts/logo.py` (`uv run scripts/logo.py`) retire le fond en gardant les lueurs et produit `public/logo.png` (bandeau), `public/favicon.png` et `public/icone-192.png` (l'œuf seul).
- Écran principal : en haut le nom, le mode, l'objectif, la progression et les étoiles, puis le sélecteur de map. Au centre le plateau. À droite la timeline du tour et la fiche du sort sélectionné. En bas les caractéristiques (PA/PM/PO, restant / max avec − / +) et la barre de sorts (2 rangées de 11, icônes du jeu sans cadre, petit bouton de variante collé dans l'angle haut-droit, ordre par défaut celui du grimoire du jeu : `ordre` dans `data/sorts.json`). Au survol d'un sort : sa fiche (PA, PO, contraintes, description officielle sans ce qui concerne les dégâts, rôle pour l'infection). Avec un sort choisi, seules les cases qu'il peut vraiment viser s'allument (`refusCibleSpecifique` : un Arbre, une Poupée, soi-même…).
- Maquette de référence : `docs/maquette/Main.dc.html` (source) et la version en ligne : https://claude.ai/artifact/32ywE4pFMTxuELnEEof8eN
- Tableau des sorts (Claude Sheets) : https://claude.ai/artifact/5BkwYFjL7wbFvbRu3aqQCK

## Stack

- Nuxt 4 + TypeScript, en SPA statique pour la V1, Pinia pour l'état de la partie.
- Moteur de jeu en TypeScript pur dans `engine/` (sans Vue), testé avec Vitest (`pnpm test`) :
  - `grille.ts` : coordonnées losange, distance, voisines, en ligne / en diagonale ;
  - `plateau.ts` : une map de `data/maps.json` + les cases occupées (marchable, libre, bloque la LdV) ;
  - `ldv.ts` : ligne de vue (obstacles, cases `x` et entités bloquent ; le vide non) ;
  - `chemins.ts` : cases accessibles en PM et plus court chemin, avec des cases d'arrêt (le tacle) ;
  - `portee.ts` : cases qu'un sort peut viser (PO min/max, bonus de PO, en ligne, diagonale, case libre, LdV), avec la raison du refus ;
  - `zones.ts` : cercle, carré, croix ;
  - `sorts.ts` : les sorts de `data/sorts.json` et la table `COMPORTEMENTS` (ce que chaque sort fait pour l'infection, écrit à la main comme `infection-roles.json`, à corriger si le jeu la contredit) ;
  - `partie.ts` : état de la partie, `jouer(partie, action)` (déplacement, sort ou fin de tour, vérifié, avec un bilan pour la timeline), `acteurCourant`, `termine`, `rejouer` pour annuler, `score` ;
  - `salle.ts` : tirage d'une salle (3 à 8 ennemis sur les cases bleues des données), cases de placement du joueur (rouges des données) ; `equipes(map)` donne ces couleurs (les mêmes sur toutes les maps, constaté en jeu). Le plateau affiche toujours les cases du joueur en bleu et celles des ennemis en rouge ;
  - `mouvements.ts` : direction (8 directions du jeu), attirance, poussée, recul ;
  - `apercu.ts` : zone d'un sort, pour la colorer au survol.
  - `categories.ts` : type de chaque map (zones normales : 10 ou 12 cases de placement par équipe et une vraie position sur la carte du monde ; zones spéciales : le reste des maps de zone, dont les instances en [0, 0] ; donjons ; Kolizéum et arènes ; Songes ; autres : Mode tactique, Foire du Trool, zones privées, mini-jeux où les équipes ne se rejoignent pas).
  - Vérification des types : `pnpm typecheck:engine`.
- La Bloqueuse : Substitution échange sa place avec un allié, Célérité lui donne +4 PM. La Surpuissante : Ardeur Estivale donne +3 PM à la cible. Utile pour une invocation qui joue après (La Sacrifiée, La Folle).
- **Tacle**, simplifié : on se fait toujours tacler. Le Sadida et ses invocations ne peuvent pas quitter le contact d'un ennemi, et un déplacement s'arrête sur la première case au contact (on y entre, on n'en ressort pas). Pas de perte de PA ni de PM. Les déplacements forcés ne sont pas concernés. Célérité rend La Bloqueuse Intaclable (`arretTacle` dans `engine/partie.ts`).
- Pas encore simulé : Rempotage (pas lançable au T1 de toute façon), le Tacle gagné par Substitution, la limite d'invocations, La Fourbe (relance initiale).
- App (`app/`) :
  - `stores/barre.ts` : barre d'action façon MMO. Ordre des 22 emplacements (glisser-déposer, `sadikoi:barre`) et touche de chaque emplacement (codes physiques `KeyboardEvent.code`, `sadikoi:touches`, réglables dans les Réglages ; libellés lus dans la disposition du clavier si le navigateur la donne, sinon AZERTY). `useRaccourcis` écoute le clavier.
  - `stores/partie.ts` : store Pinia. Salle, variantes et stats (gardées dans `localStorage`, clés `sadikoi:*`), liste des actions ; la partie est rejouée à chaque changement, et une action devenue impossible (variante ou stat changée) est retirée avec un message.
  - `components/` : `Bienvenue` (présentation, ouverte d'office à la première visite, `sadikoi:bienvenue`, puis par le bouton « ? » du bandeau), `Reglages` (fenêtre ouverte par le bouton à clé du bandeau : personnage femme / homme, types de map gardés dans `sadikoi:categories`, raccourcis de la barre), `Bandeau` (mode en cours, map et où elle se trouve, progression, étoiles, boutons), `ChoixSalle` (coin haut-gauche du plateau : mode, et map choisie dans une liste avec recherche, parmi les types cochés ou les salles de boss), `Plateau` (SVG cadré sur les cases de la map, placement, portée, zone, déplacement, aperçu des infections au survol, trace des déplacements de l'action affichée), `Timeline` (actions par acteur, clic sur une action ou ◀ ▶ pour revoir le plateau à ce moment, annuler, rejouer, replacer, valider le placement, fin du tour et résultat), `FicheSort`, `Caracteristiques`, `BarreSorts` (sorts du Sadida avec ⇄, ou ceux de l'invocation qui joue), `Etoiles`.
  - `utils/sorts-ui.ts` : élément, couleur et texte d'infection de chaque sort.
  - `data/maps.json` est chargé à part au démarrage (2,6 Mo, `import()` dynamique).
  - Le moteur clone la partie avec `structuredClone` : lui passer des copies simples, jamais des objets réactifs de Vue.
- Lancer : `pnpm dev` (port 3000). Build statique : `pnpm generate` → `.output/public`.
- Plateau en SVG.
- **Langues** : français (`/`), anglais (`/en`), espagnol (`/es`), choisies dans le bandeau (bouton à drapeau, `ChoixLangue` et `Drapeau`, drapeaux en SVG car les émojis drapeaux ne s’affichent pas sous Windows) ou les réglages ; la langue reste dans l'adresse (partage compris). Tout est dans `app/i18n/` :
  - `fr.ts` (référence), `en.ts`, `es.ts` : textes de l'interface, mêmes clés, phrases avec `{paramètres}` ou fonctions pour les pluriels. Aucun texte en dur dans les composants : tout passe par `t()`. Une nouvelle clé s'ajoute dans les trois fichiers (le type l'impose).
  - `infection.ts` : le rôle d'infection de chaque sort en anglais et en espagnol (et celui des sorts d'invocation en français), traduit à la main ; `{s:<id>}` / `{i:<id>}` donnent le nom officiel d'un sort / d'une invocation.
  - `index.ts` : `t()`, `choisirLangue()`, les noms du jeu traduits (`nomSort`, `nomInvocation`, `nomJeu` pour les lieux et monstres), et `texteMessage()`.
  - Le moteur ne produit jamais de phrase : refus et bilans sont des codes avec paramètres (`engine/messages.ts`), mis en texte par l'interface (clés `m.*`). Les entités y sont des références, nommées par `store.nomAffiche`.
  - Filtre des dégâts des descriptions (`descriptionUtile`, `app/utils/sorts-ui.ts`) : règles propres à chaque langue, écrites d'après les descriptions officielles ; à revoir si un patch change les textes.
  - `public/_redirects` : Cloudflare Pages sert l'app sur `/en` et `/es`.
- Code sur GitHub : https://github.com/Nundra/sadikoi (branche `main`). Versions : V1 = tag `v1.0.0`.
- En ligne : https://sadikoi.pages.dev/ (Cloudflare Pages, redéployé à chaque push sur `main`).
- Déploiement : Cloudflare branché directement sur le dépôt GitHub par Jérémie (pas de configuration Cloudflare dans le projet). Site statique : commande de build `pnpm generate`, dossier publié `.output/public`. D1 plus tard pour la V2.
- Scripts de données en Python, lancés avec `uv run`.
