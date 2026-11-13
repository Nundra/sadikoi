#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["UnityPy"]
# ///
"""Régénère data/maps.json : les maps de combat du jeu, case par case.

Usage :
    uv run scripts/extract-maps.py <dossier dofus-sqlite> [<dossier Dofus_Data du client>]

- <dossier dofus-sqlite> contient dofus.sqlite et i18n_fr.json, téléchargés sur la
  dernière release de https://github.com/ledouxm/dofus-sqlite (noms, zones, donjons).
- Les cases ne sont pas dans dofus-sqlite (son maps.sqlite ne contient que les objets
  interactifs) : elles sont lues dans les bundles Unity du client Dofus 3 installé,
  StreamingAssets/Content/Map/Data/mapdata_assets_world_*.bundle.
  Par défaut : ~/.config/Ankama/Dofus-dofus3/Dofus_Data (client Linux).

On ne garde que les maps de combat, c'est-à-dire celles qui ont des cases de
placement rouges et bleues.

La salle du boss d'un donjon n'est pas indiquée dans les données du jeu : elle est
déduite du nom des salles (voir salle_du_boss), et data/salles-boss.json, écrit à
la main, corrige les cas où la déduction se trompe.
"""
import json
import re
import sqlite3
import sys
import unicodedata
import warnings
from pathlib import Path

import UnityPy

ROOT = Path(__file__).resolve().parent.parent
CLIENT = Path.home() / ".config/Ankama/Dofus-dofus3/Dofus_Data"

# Une lettre par case, dans l'ordre des cellNumber (0 à 559)
LEGENDE = {
    "_": "marchable",
    "r": "placement rouge (marchable)",
    "b": "placement bleu (marchable)",
    "x": "marchable, bloque la ligne de vue",
    "#": "obstacle : ni marchable, bloque la ligne de vue",
    ".": "vide : ni marchable, ne bloque pas la ligne de vue",
}

ORDINAUX = ["premiere", "deuxieme", "troisieme", "quatrieme", "cinquieme", "sixieme",
            "septieme", "huitieme", "neuvieme", "dixieme", "onzieme", "douzieme",
            "treizieme", "quatorzieme", "quinzieme", "seizieme", "dix-septieme",
            "dix-huitieme", "dix-neuvieme", "vingtieme"]


def sans_accents(s: str) -> str:
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()


def code_case(c: dict) -> str:
    if not c["mov"]:
        return "." if c["los"] else "#"
    if c["red"] and not c["blue"]:
        return "r"
    if c["blue"] and not c["red"]:
        return "b"
    return "_" if c["los"] else "x"


def version_unity(client: Path) -> str:
    # Les bundles n'indiquent pas leur version de Unity : on la lit dans le client.
    m = re.search(rb"\d{4}\.\d+\.\d+f\d+", (client / "globalgamemanagers").read_bytes()[:4096])
    return m.group().decode()


def lire_cases(client: Path) -> dict[int, str]:
    warnings.filterwarnings("ignore", module="UnityPy")
    UnityPy.config.FALLBACK_UNITY_VERSION = version_unity(client)
    cases = {}
    bundles = sorted((client / "StreamingAssets/Content/Map/Data").glob("mapdata_assets_world_*.bundle"))
    for i, f in enumerate(bundles, 1):
        for o in UnityPy.load(str(f)).objects:
            if o.type.name != "MonoBehaviour":
                continue
            t = o.read_typetree()
            cells = t.get("cellsData") or []
            if len(cells) == 560:
                cases[t["id"]] = "".join(code_case(c) for c in sorted(cells, key=lambda c: c["cellNumber"]))
        print(f"\r{i}/{len(bundles)} bundles, {len(cases)} maps", end="", file=sys.stderr)
    print(file=sys.stderr)
    return cases


def numero_salle(nom: str) -> int | None:
    n = sans_accents(nom)
    if m := re.search(r"salle\s+(\d+)", n):
        return int(m.group(1))
    # le plus long d'abord, pour que « dix-septieme » ne soit pas lu « septieme »
    for k in sorted(range(len(ORDINAUX)), key=lambda k: -len(ORDINAUX[k])):
        if re.search(rf"\b{ORDINAUX[k]}\b", n):
            return k + 1
    return None


def salle_du_boss(salles: list[tuple[int, str]], bosses: list[str]) -> tuple[int | None, bool]:
    """salles : (mapId, nom) des maps de combat du donjon.

    Renvoie (mapId supposé, sûr ?). Pas sûr = la salle au plus grand numéro, alors que
    le donjon a aussi des salles nommées (« Salle du cœur », « Sortie »…) : à vérifier.
    """
    if not bosses or not salles:  # les Expéditions n'ont pas de boss
        return None, True
    noms_boss = [re.sub(r"^(le |la |les |l')", "", sans_accents(b)) for b in bosses]
    for mid, nom in salles:
        # « Nid du Kwakwa - Première salle » : le nom du boss est souvent dans celui du
        # donjon, on ne regarde que la partie propre à la salle.
        n = sans_accents(re.split(r"\s[-–]\s", nom)[-1])
        if any(b and b in n for b in noms_boss) or re.search(r"\b(trone|boss|derniere salle|salle finale)\b", n):
            return mid, True
    if len(salles) == 1:
        return salles[0][0], True
    numeros = [numero_salle(nom) for _, nom in salles]
    if not any(numeros):
        return None, False
    return salles[numeros.index(max(n or 0 for n in numeros))][0], all(numeros)


def main(src: Path, client: Path) -> None:
    db = sqlite3.connect(src / "dofus.sqlite")
    textes = json.loads((src / "i18n_fr.json").read_text(encoding="utf-8"))
    tx = lambda i: textes.get(str(i), "")
    corrections = json.loads((ROOT / "data" / "salles-boss.json").read_text(encoding="utf-8"))

    zones = {i: tx(n) for i, n in db.execute("SELECT id, nameId FROM AreaData")}
    sous_zones = {i: (tx(n), zones.get(a, "")) for i, n, a in db.execute("SELECT id, nameId, areaId FROM SubAreaData")}
    infos = {i: (tx(n) if n else "", sz, x, y)
             for i, n, sz, x, y in db.execute("SELECT id, nameId, subAreaId, posX, posY FROM MapInformationData")}
    monstres = lambda ids: [tx(r[0]) for i in ids for r in db.execute("SELECT nameId FROM MonsterData WHERE id=?", (i,))]

    cases = lire_cases(client)
    combat = {mid for mid, c in cases.items() if "r" in c and "b" in c}

    donjon_de, boss_de, a_verifier, manquants = {}, {}, [], []
    for did, nid, bosses in db.execute("SELECT id, nameId, bosses FROM DungeonData"):
        nom, bosses = tx(nid), monstres(json.loads(bosses))
        mids = [r[0] for r in db.execute("SELECT target_id FROM DungeonData_mapIds_junction WHERE DungeonData_id=?", (did,))]
        salles = [(m, infos.get(m, ("",))[0]) for m in mids if m in combat]
        for m, _ in salles:
            donjon_de[m] = nom
        if str(did) in corrections:
            boss, sur = corrections[str(did)]["map"], True
        else:
            boss, sur = salle_du_boss(salles, bosses)
        if boss:
            boss_de[boss] = bosses
        if boss and not sur:
            a_verifier.append(f"{did} {nom} : {infos[boss][0]} ({boss})")
        elif not boss and salles and bosses:
            manquants.append(f"{did} {nom} : " + ", ".join(f"{n or '(sans nom)'} ({m})" for m, n in salles))

    maps = []
    for mid in sorted(combat):
        nom, sz, x, y = infos.get(mid, ("", 0, 0, 0))
        sous_zone, zone = sous_zones.get(sz, ("", ""))
        m = {"id": mid, "nom": nom or sous_zone, "zone": zone, "sous_zone": sous_zone, "pos": [x, y]}
        if mid in donjon_de:
            m["donjon"] = donjon_de[mid]
        if mid in boss_de:
            m["boss"] = boss_de[mid]
        m["cases"] = cases[mid]
        maps.append(m)

    out = {
        "source": "cases : client Dofus 3 (bundles mapdata) ; noms et donjons : dofus-sqlite",
        "legende": LEGENDE,
        "maps": maps,
    }
    (ROOT / "data" / "maps.json").write_text(
        json.dumps(out, ensure_ascii=False, separators=(",", ":")).replace(',{"id"', ',\n{"id"'), encoding="utf-8")
    print(f"{len(maps)} maps de combat dont {len(boss_de)} salles de boss → data/maps.json")
    for titre, liste in (("Salle du boss déduite, à vérifier", a_verifier),
                         ("Salle du boss non trouvée", manquants)):
        if liste:
            print(f"\n{titre} ({len(liste)} donjons, à corriger dans data/salles-boss.json) :")
            print("\n".join("  " + s for s in liste))


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        sys.exit(__doc__)
    main(Path(sys.argv[1]), Path(sys.argv[2]) if len(sys.argv) == 3 else CLIENT)
