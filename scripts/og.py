#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["Pillow", "fonttools", "brotli"]
# ///
"""Image de partage (Open Graph) : public/og.png, 1200 × 630, pour l'aperçu des liens (Discord…).

Usage :
    uv run scripts/og.py

Fond de l'app (bleu-vert sombre, cadre doré), le logo (refait en grand depuis docs/logo/ avec
scripts/logo.py), l'accroche en Marcellus (police du site, public/polices/) et une rangée
d'icônes de sorts d'infection (public/sorts/). À relancer si le logo ou l'accroche changent.
"""
import io
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from logo import SOURCE, blanc_vers_alpha, recadrer  # noqa: E402

LARGEUR, HAUTEUR = 1200, 630
ACCROCHE = "Infecte tous les ennemis dès le tour 1"
SOUS_TITRE = "Salle d’entraînement du Sadida · Dofus 3"
# Ronce, Contagion, Miasmes, Sacrifice Vaudou, Cigüe, Mandragore, La Sacrifiée, La Folle
SORTS = [13516, 13575, 13562, 13531, 13577, 13559, 13522, 13515]
OR, OR_CLAIR, TEXTE = (224, 178, 90), (240, 205, 133), (200, 211, 209)


def police(nom: str, taille: int) -> ImageFont.FreeTypeFont:
    """Les polices du site sont en woff2 : on les repasse en TrueType pour Pillow."""
    ttf = io.BytesIO()
    f = TTFont(ROOT / "public" / "polices" / nom)
    f.flavor = None
    f.save(ttf)
    ttf.seek(0)
    return ImageFont.truetype(ttf, taille)


def fond() -> Image.Image:
    """Dégradé radial comme l'écran du jeu (#16303a au centre vers #0a1317)."""
    petit = Image.new("RGB", (120, 63))
    centre, bord = (22, 48, 58), (10, 19, 23)
    for y in range(63):
        for x in range(120):
            d = min(1.0, (((x - 60) / 70) ** 2 + ((y - 26) / 45) ** 2) ** 0.5)
            petit.putpixel((x, y), tuple(round(c + (b - c) * d) for c, b in zip(centre, bord)))
    return petit.resize((LARGEUR, HAUTEUR), Image.BICUBIC).filter(ImageFilter.GaussianBlur(6))


def centrer(draw: ImageDraw.ImageDraw, y: int, texte: str, f: ImageFont.FreeTypeFont, couleur) -> int:
    x0, y0, x1, y1 = draw.textbbox((0, 0), texte, font=f)
    draw.text(((LARGEUR - (x1 - x0)) // 2 - x0, y - y0), texte, font=f, fill=couleur)
    return y + (y1 - y0)


def main() -> None:
    image = fond().convert("RGBA")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((18, 18, LARGEUR - 19, HAUTEUR - 19), radius=28, outline=OR, width=3)

    source = Image.open(SOURCE / "logo-horizontal.jpeg")
    source = source.resize((source.width // 2, source.height // 2), Image.LANCZOS)
    logo = recadrer(blanc_vers_alpha(source))
    h = 230
    logo = logo.resize((round(logo.width * h / logo.height), h), Image.LANCZOS)
    image.alpha_composite(logo, ((LARGEUR - logo.width) // 2, 52))

    y = centrer(draw, 318, ACCROCHE, police("marcellus.woff2", 58), OR_CLAIR)
    centrer(draw, y + 22, SOUS_TITRE, police("nunito-sans.woff2", 30), TEXTE)

    cote, ecart = 72, 22
    x = (LARGEUR - (len(SORTS) * cote + (len(SORTS) - 1) * ecart)) // 2
    for sid in SORTS:
        icone = Image.open(ROOT / "public" / "sorts" / f"{sid}.png").convert("RGBA").resize((cote, cote), Image.LANCZOS)
        masque = Image.new("L", (cote, cote), 0)
        ImageDraw.Draw(masque).rounded_rectangle((0, 0, cote - 1, cote - 1), radius=12, fill=255)
        image.paste(icone, (x, 488), masque)
        x += cote + ecart

    image.convert("RGB").save(ROOT / "public" / "og.png", optimize=True)
    print("public/og.png")


if __name__ == "__main__":
    main()
