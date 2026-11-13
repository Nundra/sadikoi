#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["Pillow"]
# ///
"""Prépare le logo de l'app à partir des originaux sur fond blanc (docs/logo/).

Usage :
    uv run scripts/logo.py

- Seul le fond relié aux bords de l'image devient transparent : on le repère par remplissage
  depuis les bords à travers les pixels clairs, puis on y applique « couleur vers alpha » (plus
  un pixel est proche du blanc, plus il est transparent), ce qui garde les lueurs. Ce qui est
  entouré d'un contour (les lettres crème, l'œuf) reste opaque.
- public/logo.png : le logo horizontal (œuf + nom), recadré, 120 px de haut (2x du bandeau).
- public/favicon.png et public/icone-192.png : l'œuf seul, carré, pour l'onglet et l'écran d'accueil.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "docs" / "logo"
SORTIE = ROOT / "public"
SEUIL = 10  # alpha (sur 255) sous lequel un pixel est considéré comme du fond (bruit du JPEG)
CLAIR = 110  # écart au blanc jusqu'où le remplissage depuis les bords se propage (fond et lueurs)
RECADRAGE = 40  # alpha minimal pris en compte pour recadrer


def fond(im: Image.Image) -> list[bool]:
    """Les pixels du fond : clairs et reliés aux bords de l'image."""
    ecart = Image.new("RGB", im.size)
    ecart.putdata([(max(255 - r, 255 - g, 255 - b), 0, 0) for r, g, b in im.getdata()])
    l, h = im.size
    graines = [(x, 0) for x in range(0, l, 16)] + [(x, h - 1) for x in range(0, l, 16)] \
        + [(0, y) for y in range(0, h, 16)] + [(l - 1, y) for y in range(0, h, 16)]
    for xy in graines:
        if ecart.getpixel(xy)[0] <= CLAIR and ecart.getpixel(xy)[1] == 0:
            # Remplit en vert tout ce qui est relié et assez clair (écart au point de départ ≤ CLAIR)
            ImageDraw.floodfill(ecart, xy, (0, 255, 0), thresh=CLAIR)
    return [g == 255 for _, g, _ in ecart.getdata()]


def blanc_vers_alpha(im: Image.Image) -> Image.Image:
    im = im.convert("RGB")
    est_fond = fond(im)
    sortie = Image.new("RGBA", im.size)
    pixels = []
    for (r, g, b), dehors in zip(im.getdata(), est_fond):
        if not dehors:
            pixels.append((r, g, b, 255))
            continue
        a = max(255 - r, 255 - g, 255 - b)
        if a < SEUIL:
            pixels.append((0, 0, 0, 0))
            continue
        # La couleur qui, posée sur du blanc avec cette opacité, redonne le pixel d'origine
        f = 255 / a
        pixels.append(tuple(max(0, min(255, round(255 - (255 - c) * f))) for c in (r, g, b)) + (a,))
    sortie.putdata(pixels)
    return sortie


def recadrer(im: Image.Image, marge: int = 8) -> Image.Image:
    # On ignore le bruit très transparent (lueurs lointaines, artefacts du JPEG)
    x0, y0, x1, y1 = im.getchannel("A").point(lambda a: 255 if a >= RECADRAGE else 0).getbbox()
    return im.crop((max(0, x0 - marge), max(0, y0 - marge), min(im.width, x1 + marge), min(im.height, y1 + marge)))


def carre(im: Image.Image) -> Image.Image:
    cote = max(im.size)
    fond = Image.new("RGBA", (cote, cote))
    fond.paste(im, ((cote - im.width) // 2, (cote - im.height) // 2))
    return fond


def main() -> None:
    source = Image.open(SOURCE / "logo-horizontal.jpeg")
    source = source.resize((source.width // 2, source.height // 2), Image.LANCZOS)  # assez grand, et plus rapide
    horizontal = recadrer(blanc_vers_alpha(source))
    h = 120
    horizontal.resize((round(horizontal.width * h / horizontal.height), h), Image.LANCZOS).save(SORTIE / "logo.png", optimize=True)

    # L'œuf est la partie gauche du logo horizontal, avant le nom
    oeuf = recadrer(horizontal.crop((0, 0, round(horizontal.width * 0.36), horizontal.height)))
    for nom, cote in (("favicon.png", 64), ("icone-192.png", 192)):
        carre(oeuf).resize((cote, cote), Image.LANCZOS).save(SORTIE / nom, optimize=True)
    print("public/logo.png, public/favicon.png, public/icone-192.png")


if __name__ == "__main__":
    main()
