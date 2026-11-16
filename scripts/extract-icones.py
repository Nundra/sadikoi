#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["UnityPy"]
# ///
"""Extrait les icônes et les portraits du jeu utilisés par l'app dans public/.

Usage :
    uv run scripts/extract-icones.py <dossier dofus-sqlite> [<dossier Dofus_Data du client>]

- <dossier dofus-sqlite> contient dofus.sqlite, images-spell.zip, images-cosmetic.zip et
  images-monster.zip, téléchargés sur la dernière release de https://github.com/ledouxm/dofus-sqlite.
- Les pictos d'interface (PA, PM, PO, invocations, étoiles, clé des réglages, flèches de variante, point d'interrogation de l'aide, cadenas, trophée, calendrier, sablier) sont lus dans les bundles
  Unity du client Dofus 3 installé (StreamingAssets/aa/StandaloneLinux64).
  Par défaut : ~/.config/Ankama/Dofus-dofus3/Dofus_Data (client Linux).

Sortie :
- public/sorts/<id du sort>.png : sorts du Sadida et de ses invocations (data/sorts.json),
  en 2x. Le fichier du jeu est nommé par l'icône du sort (SpellData.iconId), pas par le sort.
- public/icones/<nom>.png : pictos d'interface, et l'icône de l'objet Prycipithon Mate (client,
  Content/Picto/Items, nommée par ItemData.iconId).
- public/portraits/sadida-femme.png et sadida-homme.png : le personnage en pied (pose de repos) de la
  classe et de la pose choisies dans data/portraits.json (images-cosmetic.zip,
  idles/2x/<classe><0 homme|1 femme>_<pose>.png).
- public/portraits/<id du monstre>.png : les ennemis et les invocations de data/portraits.json.
  Dans images-monster.zip, l'image est nommée par l'identifiant graphique (MonsterData.gfxId).
"""
import json
import re
import sqlite3
import sys
import warnings
import zipfile
from pathlib import Path

import UnityPy

ROOT = Path(__file__).resolve().parent.parent
CLIENT = Path.home() / ".config/Ankama/Dofus-dofus3/Dofus_Data"

# Nom dans le jeu → nom dans public/icones, par bundle
PICTOS = {
    "spriteassets_assets_2x.bundle": {"pa": "pa", "pm": "pm", "po": "po", "invocation": "invo"},
    "icons_assets_2x.bundle": {"starFilled": "etoile-pleine", "starEmpty": "etoile-vide", "spanner": "reglages", "exchange": "variante", "questionMark": "aide", "lock": "cadenas", "trophy": "trophee", "calendar": "calendrier", "hourglass": "sablier"},
}


def version_unity(client: Path) -> str:
    m = re.search(rb"\d{4}\.\d+\.\d+f\d+", (client / "globalgamemanagers").read_bytes()[:4096])
    return m.group().decode()


def icones_de_sorts(src: Path) -> int:
    db = sqlite3.connect(src / "dofus.sqlite")
    donnees = json.loads((ROOT / "data" / "sorts.json").read_text(encoding="utf-8"))
    ids = [s["id"] for s in donnees["sorts"]] + [s["id"] for i in donnees["invocations"] for s in i["sorts"]]
    sortie = ROOT / "public" / "sorts"
    sortie.mkdir(parents=True, exist_ok=True)
    n = 0
    with zipfile.ZipFile(src / "images-spell.zip") as z:
        noms = set(z.namelist())
        for sid in ids:
            (icone,) = db.execute("SELECT iconId FROM SpellData WHERE id=?", (sid,)).fetchone()
            nom = f"2x/sort_{icone}.png"
            if nom not in noms:
                print(f"  pas d'icône pour le sort {sid} ({nom})", file=sys.stderr)
                continue
            (sortie / f"{sid}.png").write_bytes(z.read(nom))
            n += 1
    return n


def pictos(client: Path) -> int:
    warnings.filterwarnings("ignore", module="UnityPy")
    UnityPy.config.FALLBACK_UNITY_VERSION = version_unity(client)
    sortie = ROOT / "public" / "icones"
    sortie.mkdir(parents=True, exist_ok=True)
    n = 0
    for bundle, voulus in PICTOS.items():
        env = UnityPy.load(str(client / "StreamingAssets/aa/StandaloneLinux64" / bundle))
        for o in env.objects:
            if o.type.name != "Sprite":
                continue
            sprite = o.read()
            if sprite.m_Name in voulus:
                sprite.image.save(sortie / f"{voulus[sprite.m_Name]}.png")
                n += 1
    return n


# Icônes d'objets (ItemData.iconId → nom dans public/icones), dans Content/Picto/Items du client
OBJETS = {"217021": "prycipithon"}  # Prycipithon Mate


def objets(client: Path) -> int:
    sortie = ROOT / "public" / "icones"
    n = 0
    for o in UnityPy.load(str(client / "StreamingAssets/Content/Picto/Items/item_assets_2x.bundle")).objects:
        if o.type.name != "Texture2D":
            continue
        t = o.read()
        if t.m_Name in OBJETS:
            t.image.save(sortie / f"{OBJETS[t.m_Name]}.png")
            n += 1
    return n


def portraits(src: Path) -> int:
    db = sqlite3.connect(src / "dofus.sqlite")
    liste = json.loads((ROOT / "data" / "portraits.json").read_text(encoding="utf-8"))
    sortie = ROOT / "public" / "portraits"
    sortie.mkdir(parents=True, exist_ok=True)
    sadida = liste["sadida"]
    with zipfile.ZipFile(src / "images-cosmetic.zip") as z:
        for sexe, chiffre in (("homme", 0), ("femme", 1)):
            (sortie / f"sadida-{sexe}.png").write_bytes(z.read(f"idles/2x/{sadida['classe']}{chiffre}_{sadida['pose']}.png"))
    n = 2
    with zipfile.ZipFile(src / "images-monster.zip") as z:
        noms = set(z.namelist())
        for mid in [e["id"] for e in liste["ennemis"]] + liste["invocations"]:
            (gfx,) = db.execute("SELECT gfxId FROM MonsterData WHERE id=?", (mid,)).fetchone()
            nom = f"2x/{gfx}.png"
            if nom not in noms:
                print(f"  pas de portrait pour le monstre {mid} ({nom})", file=sys.stderr)
                continue
            (sortie / f"{mid}.png").write_bytes(z.read(nom))
            n += 1
    return n


def main(src: Path, client: Path) -> None:
    print(f"{icones_de_sorts(src)} icônes de sorts → public/sorts/")
    print(f"{portraits(src)} portraits → public/portraits/")
    print(f"{pictos(client)} pictos → public/icones/")
    print(f"{objets(client)} icônes d'objets → public/icones/")


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        sys.exit(__doc__)
    main(Path(sys.argv[1]), Path(sys.argv[2]) if len(sys.argv) == 3 else CLIENT)
