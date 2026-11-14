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
      date: '2026-11-14',
      nouveautes: [
        'Avec un sort choisi, les cases à portée mais sans ligne de vue s’affichent en bleu pâle, comme en jeu.',
        'Notes de version, depuis les réglages.',
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
      date: '2026-11-14',
      nouveautes: [
        'With a spell selected, cells in range but without line of sight are shown in pale blue, as in game.',
        'Release notes, from the settings.',
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
      date: '2026-11-14',
      nouveautes: [
        'Con un hechizo elegido, las casillas a alcance pero sin línea de visión se muestran en azul pálido, como en el juego.',
        'Notas de versión, desde los ajustes.',
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
