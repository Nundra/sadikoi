/**
 * Notes de version, de la plus récente à la plus ancienne, dans chaque langue (fenêtre
 * « Notes de version », ouverte depuis les réglages). À compléter à chaque mise en ligne,
 * en phrases pour les joueurs (pas les messages de commit).
 */
import type { Langue } from './index'

export interface NoteDeVersion {
  /** Date de mise en ligne, AAAA-MM-JJ. */
  date: string
  nouveautes: string[]
  corrections: string[]
}

export const NOTES: Record<Langue, NoteDeVersion[]> = {
  fr: [
    {
      date: '2026-11-19',
      nouveautes: [],
      corrections: [
        'La Groute et le Tréant sont Intaclables : ils peuvent quitter le contact d’un ennemi.',
        'Harmonie rend le Sadida Intaclable pour le tour.',
      ],
    },
    {
      date: '2026-11-17',
      nouveautes: [
        'Défi du jour : « Voir tout le classement » sous le top 3 ouvre la liste de tous les scores.',
        'Bouton « Défi du jour » à côté du logo ; le numéro de salle et le record de run passent sous le choix du mode.',
        'Les obstacles qui bloquent la ligne de vue s’affichent en petites dalles en relief, comme en mode tactique.',
        'L’Arbre Feuillu a son propre visuel, plein de feuilles, distinct de l’Arbre.',
      ],
      corrections: [
        'Classement du défi : seul ton meilleur score du jour compte. Si tu fais 150 puis 100, tu n’apparais qu’à 150.',
      ],
    },
    {
      date: '2026-11-16',
      nouveautes: [
        'Défi du jour (/daily) : chaque jour, la même salle pour tous les joueurs, une map de zone ou de Songe avec 6 à 8 ennemis, au niveau 200 et aux caractéristiques par défaut. Une invitation s’affiche à l’arrivée tant qu’il n’est pas fait.',
        'Classement du jour : le top 3 dans le coin du plateau, le top 5 à la fin, anonyme. Le serveur rejoue chaque tour envoyé avant de le classer.',
      ],
      corrections: [
        'Classement du défi : une seule ligne par score, et « toi » s’affiche sur la ligne qui a les points de ton record, même si quelqu’un l’a fait avant toi.',
        'Il faut au moins 1 étoile pour entrer au classement du défi.',
        'Classement du défi : tous les scores du jour à la fin, avec le nombre de joueurs pour chacun (un même score refait ne compte qu’une fois), et le nombre de joueurs sous 1 étoile.',
      ],
    },
    {
      date: '2026-11-15',
      nouveautes: [
        'Nouvelle caractéristique Invocations (4 par défaut, de 1 à 8 dans les réglages) : au-delà, plus d’invocation possible. Les Arbres ne comptent pas, comme en jeu.',
        'Raccourcis : F1 termine le tour (touche réglable dans les réglages), Ctrl+Z annule la dernière action.',
        'Les sorts verrouillés par le niveau portent un cadenas.',
        'Chargement bien plus léger : les maps arrivent par petits paquets au lieu d’un seul gros fichier.',
        'Page de mentions légales (/legals, liée depuis les réglages et la bienvenue). Les polices sont désormais hébergées sur le site : plus aucune requête vers un service tiers.',
      ],
      corrections: [
        'Créateur de map : Ctrl+Z marche aussi avec un clavier AZERTY.',
        'La Sacrifiée : Explosion Ouatée se déclenche en visant une entité à son contact, alliée ou ennemie, et explose autour d’elle (plus besoin de viser sa propre case).',
        'Après son explosion, La Sacrifiée garde la main : son tour ne se termine qu’au clic sur « Fin du tour ».',
        'Prycipithon Mate : ses 2 PA ne rapportent plus de points s’ils ne sont pas dépensés. L’activer sans en avoir besoin ne paie plus.',
        'Les records d’avant ces changements de règles sont remis à zéro : ils ne correspondaient plus au calcul actuel.',
        'Avec un sort choisi, toutes ses cases de lancement s’affichent en bleu, comme en jeu, même celles où il ne peut pas se lancer (il faut une cible qui convient).',
        'La zone d’un sort au survol ne s’affiche que sur une cible valide : Contagion sur un ennemi Infecté, Sacrifice Vaudou sur une Poupée…',
      ],
    },
    {
      date: '2026-11-14',
      nouveautes: [
        'Avec un sort choisi, les cases à portée mais sans ligne de vue s’affichent en bleu pâle, comme en jeu.',
        'Notes de version, depuis les réglages.',
        'Sur petit écran (mobile), un écran prévient que l’app n’y est pas adaptée et conseille de jouer sur ordinateur.',
        'La langue suit celle du navigateur à la première visite, puis celle choisie par le bouton de langue.',
      ],
      corrections: [
        'Ligne de vue calculée comme dans le jeu : une ligne qui passe exactement par un coin n’est plus coupée par les deux cases qui s’y touchent.',
        'Tremblement et les autres poussées ou attirances : un ennemi décalé d’une case avance en ligne, comme en jeu, au lieu de rester bloqué en biais.',
        'Détoxication (Groute) retire 2 tours aux effets de sa cible : elle peut enlever une Infection.',
      ],
    },
    {
      date: '2026-11-13',
      nouveautes: [
        'Créateur de map : dessine ta map (cases libres, vides, obstacles, départs, ennemis), teste-la et partage-la par un lien.',
        'Interface en anglais et en espagnol (adresses /en et /es), choix de la langue par drapeau.',
        'Niveau (1 à 200) et caractéristiques (PA, PM, PO) réglables : les sorts au-dessus du niveau sont grisés et la portée suit le rang du sort.',
        'Choix du mode et de la map dans un coin du plateau, avec recherche.',
        'En training, la fin de salle propose de rejouer la salle ou de recommencer du placement.',
      ],
      corrections: [
        'Un rechargement en training redonne la même salle.',
        'Message du plateau recentré, sans passer sous le choix de la salle.',
        'Fenêtres de même largeur, boutons du bandeau plus lisibles.',
      ],
    },
  ],
  en: [
    {
      date: '2026-11-19',
      nouveautes: [],
      corrections: [
        'Groute and Treant can no longer be tackled: they can leave contact with an enemy.',
        'Harmony makes the Sadida Unlockable for the turn.',
      ],
    },
    {
      date: '2026-11-17',
      nouveautes: [
        'Daily challenge: “See the full ranking” under the top 3 opens the list of every score.',
        '“Daily challenge” button next to the logo; the room number and run record move under the mode picker.',
        'Obstacles that block line of sight now show as small raised slabs, like in tactical mode.',
        'The Leafy Tree now has its own leafy look, distinct from the Tree.',
      ],
      corrections: [
        'Challenge ranking: only your best score of the day counts. If you get 150 then 100, you only show up at 150.',
      ],
    },
    {
      date: '2026-11-16',
      nouveautes: [
        'Daily challenge (/daily): every day, the same room for every player, a zone or Dream map with 6 to 8 enemies, at level 200 with default characteristics. An invitation shows on arrival until it is done.',
        'Daily ranking: top 3 in the corner of the board, top 5 at the end, anonymous. The server replays every submitted turn before ranking it.',
      ],
      corrections: [
        'Challenge ranking: one line per score, and “you” shows on the line matching your best score, even if someone got it before you.',
        'You need at least 1 star to enter the challenge ranking.',
        'Challenge ranking: every score of the day at the end, with the number of players for each (the same score redone only counts once), and the number of players below 1 star.',
      ],
    },
    {
      date: '2026-11-15',
      nouveautes: [
        'New Summons characteristic (4 by default, 1 to 8 in the settings): beyond that, no more summoning. Trees don’t count, as in game.',
        'Shortcuts: F1 ends the turn (key adjustable in the settings), Ctrl+Z undoes the last action.',
        'Spells locked by level show a padlock.',
        'Much lighter loading: maps arrive in small packs instead of one big file.',
        'Legal notice page (/legals, linked from the settings and the welcome window). Fonts are now hosted on the site: no more requests to any third-party service.',
      ],
      corrections: [
        'Map creator: Ctrl+Z now also works with an AZERTY keyboard.',
        'The Sacrificial Doll: its explosion is triggered by targeting an entity in contact with it, ally or enemy, and explodes around the Doll (no more targeting its own cell).',
        'After exploding, the Sacrificial Doll keeps the turn: it only ends when you click “End turn”.',
        'Prycipithon Mate: its 2 AP no longer earn points when left unspent. Turning it on without needing it no longer pays off.',
        'Records set before these rule changes are reset: they no longer matched the current scoring.',
        'With a spell selected, all its casting cells are shown in blue, as in game, even where it can’t be cast (it needs a suitable target).',
        'A spell’s area on hover only shows on a valid target: Contagion on an Infected enemy, Voodoo Sacrifice on a Doll…',
      ],
    },
    {
      date: '2026-11-14',
      nouveautes: [
        'With a spell selected, cells in range but without line of sight are shown in pale blue, as in game.',
        'Release notes, from the settings.',
        'On small screens (mobile), a screen warns that the app isn’t made for them and suggests playing on a computer.',
        'The language follows the browser’s on the first visit, then the one picked with the language button.',
      ],
      corrections: [
        'Line of sight computed as in the game: a line going exactly through a corner is no longer blocked by the two cells touching there.',
        'Earthquake and other pushes or pulls: an enemy offset by one cell moves in line, as in game, instead of getting stuck diagonally.',
        'Detoxification (Groute) removes 2 turns from its target’s effects: it can clear an Infection.',
      ],
    },
    {
      date: '2026-11-13',
      nouveautes: [
        'Map creator: draw your map (free cells, voids, obstacles, starting cells, enemies), test it and share it with a link.',
        'Interface in English and Spanish (/en and /es addresses), language picked with a flag.',
        'Adjustable level (1 to 200) and characteristics (AP, MP, Range): spells above the level are greyed out and range follows the spell’s rank.',
        'Mode and map picked in a corner of the board, with search.',
        'In training, the end of a room offers to replay it or restart from placement.',
      ],
      corrections: [
        'Reloading in training brings back the same room.',
        'Board message re-centred, no longer under the room picker.',
        'Windows share the same width, header buttons easier to read.',
      ],
    },
  ],
  es: [
    {
      date: '2026-11-19',
      nouveautes: [],
      corrections: [
        'Grut y Treant ya no pueden ser placados: pueden alejarse del contacto con un enemigo.',
        'Armonía hace al Sadida No Placable durante el turno.',
      ],
    },
    {
      date: '2026-11-17',
      nouveautes: [
        'Desafío del día: «Ver toda la clasificación» bajo el top 3 abre la lista de todas las puntuaciones.',
        'Botón «Desafío del día» junto al logo; el número de sala y el récord de partida pasan bajo el selector de modo.',
        'Los obstáculos que bloquean la línea de visión se muestran como pequeñas losas en relieve, como en el modo táctico.',
        'El Árbol Frondoso tiene su propio aspecto, lleno de hojas, distinto del Árbol.',
      ],
      corrections: [
        'Clasificación del desafío: solo cuenta tu mejor puntuación del día. Si haces 150 y luego 100, solo apareces en 150.',
      ],
    },
    {
      date: '2026-11-16',
      nouveautes: [
        'Desafío del día (/daily): cada día, la misma sala para todos los jugadores, un mapa de zona o de Sueño con 6 a 8 enemigos, a nivel 200 y con las características por defecto. Una invitación aparece al llegar mientras no esté hecho.',
        'Clasificación del día: el top 3 en la esquina del tablero, el top 5 al final, anónima. El servidor repite cada turno enviado antes de clasificarlo.',
      ],
      corrections: [
        'Clasificación del desafío: una sola línea por puntuación, y «tú» aparece en la línea con los puntos de tu récord, aunque alguien la haya hecho antes.',
        'Hace falta al menos 1 estrella para entrar en la clasificación del desafío.',
        'Clasificación del desafío: todas las puntuaciones del día al final, con el número de jugadores de cada una (la misma puntuación repetida solo cuenta una vez), y el número de jugadores por debajo de 1 estrella.',
      ],
    },
    {
      date: '2026-11-15',
      nouveautes: [
        'Nueva característica Invocaciones (4 por defecto, de 1 a 8 en los ajustes): por encima, no se puede invocar más. Los Árboles no cuentan, como en el juego.',
        'Atajos: F1 termina el turno (tecla ajustable en los ajustes), Ctrl+Z deshace la última acción.',
        'Los hechizos bloqueados por el nivel muestran un candado.',
        'Carga mucho más ligera: los mapas llegan en pequeños paquetes en lugar de un solo archivo grande.',
        'Página de aviso legal (/legals, enlazada desde los ajustes y la bienvenida). Las fuentes ahora se alojan en el sitio: ya no hay peticiones a ningún servicio externo.',
      ],
      corrections: [
        'Creador de mapas: Ctrl+Z ya funciona también con un teclado AZERTY.',
        'La Sacrificada: su explosión se activa apuntando a una entidad en contacto con ella, aliada o enemiga, y estalla a su alrededor (ya no hay que apuntar a su propia casilla).',
        'Tras explotar, La Sacrificada conserva el turno: solo termina al hacer clic en «Fin del turno».',
        'Prycipithon Mate: sus 2 PA ya no dan puntos si no se gastan. Activarla sin necesitarla ya no compensa.',
        'Los récords anteriores a estos cambios de reglas se reinician: ya no correspondían al cálculo actual.',
        'Con un hechizo elegido, todas sus casillas de lanzamiento se muestran en azul, como en el juego, incluso donde no se puede lanzar (hace falta un objetivo adecuado).',
        'El área de un hechizo al pasar el ratón solo se muestra sobre un objetivo válido: Contagio sobre un enemigo Infectado, Sacrificio Vudú sobre una Muñeca…',
      ],
    },
    {
      date: '2026-11-14',
      nouveautes: [
        'Con un hechizo elegido, las casillas a alcance pero sin línea de visión se muestran en azul pálido, como en el juego.',
        'Notas de versión, desde los ajustes.',
        'En pantallas pequeñas (móvil), una pantalla avisa de que la app no está adaptada y aconseja jugar en un ordenador.',
        'El idioma sigue el del navegador en la primera visita y luego el elegido con el botón de idioma.',
      ],
      corrections: [
        'Línea de visión calculada como en el juego: una línea que pasa justo por una esquina ya no queda cortada por las dos casillas que se tocan ahí.',
        'Temblor y los demás empujes o atracciones: un enemigo desplazado una casilla avanza en línea, como en el juego, en vez de quedarse bloqueado en diagonal.',
        'Desintoxicación (Grut) quita 2 turnos a los efectos de su objetivo: puede eliminar una Infección.',
      ],
    },
    {
      date: '2026-11-13',
      nouveautes: [
        'Creador de mapas: dibuja tu mapa (casillas libres, vacíos, obstáculos, salidas, enemigos), pruébalo y compártelo con un enlace.',
        'Interfaz en inglés y español (direcciones /en y /es), idioma elegido con una bandera.',
        'Nivel (1 a 200) y características (PA, PM, alcance) ajustables: los hechizos por encima del nivel aparecen en gris y el alcance sigue el rango del hechizo.',
        'Modo y mapa elegidos en una esquina del tablero, con búsqueda.',
        'En entrenamiento, el final de la sala propone repetirla o volver a la colocación.',
      ],
      corrections: [
        'Recargar en entrenamiento devuelve la misma sala.',
        'Mensaje del tablero recentrado, ya no queda bajo el selector de sala.',
        'Ventanas del mismo ancho, botones de la cabecera más legibles.',
      ],
    },
  ],
}
