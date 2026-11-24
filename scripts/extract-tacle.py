"""
Régénère data/tacle.json : de quoi calculer le tacle des ennemis et la fuite des invocations.

    python3 scripts/extract-tacle.py <dossier dofus-sqlite>

Le dossier contient monstersdata.json et subareasdata.json de la release dofus-sqlite.
Comme en jeu, Tacle = bonus de Tacle + Agilité / 10, et Fuite = bonus de Fuite + Agilité / 10.

- monstres : le Tacle de chaque monstre, un nombre par grade ;
- sousZones : les monstres de chaque sous-zone (ceux qui ont des données de grade) ;
- maps : la sous-zone de chaque map de data/maps.json ;
- invocations : la Fuite des invocations du Sadida (dernier grade, comme leurs autres
  caractéristiques).
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def objets(fichier: Path, classe: str) -> list[dict]:
    donnees = json.loads(fichier.read_text(encoding="utf-8"))
    return [r["data"] for r in donnees["references"]["RefIds"] if r["type"]["class"] == classe]


def liste(v) -> list:
    # Les tableaux sont parfois rangés en texte JSON
    if isinstance(v, str):
        v = json.loads(v)
    return v["Array"] if isinstance(v, dict) else v


def main(src: Path) -> None:
    grades = {m["id"]: liste(m["grades"]) for m in objets(src / "monstersdata.json", "MonsterData")}
    tacle = {mid: [max(0, g["tackleBonus"] + g["agility"] // 10) for g in gs] for mid, gs in grades.items() if gs}

    ids_maps = {m["id"] for m in json.loads((ROOT / "data" / "maps.json").read_text(encoding="utf-8"))["maps"]}
    sous_zones: dict[int, list[int]] = {}
    maps: dict[int, int] = {}
    for sz in objets(src / "subareasdata.json", "SubAreaData"):
        monstres = sorted({m for m in liste(sz["monsters"]) if m in tacle})
        if monstres:
            sous_zones[sz["id"]] = monstres
        for mid in liste(sz["mapIds"]):
            if mid in ids_maps:
                maps[mid] = sz["id"]

    utiles = sorted({m for ms in sous_zones.values() for m in ms})
    sadida = json.loads((ROOT / "data" / "sorts.json").read_text(encoding="utf-8"))
    invocations = {}
    for i in sadida["invocations"]:
        g = grades[i["id"]][-1]
        invocations[i["id"]] = max(0, g["tackleEvade"] + g["agility"] // 10)

    sortie = {
        "source": "dofus-sqlite (monstersdata.json, subareasdata.json) ; Tacle = tackleBonus + agility / 10, Fuite = tackleEvade + agility / 10",
        "invocations": {str(k): v for k, v in invocations.items()},
        "monstres": {str(m): tacle[m] for m in utiles},
        "sousZones": {str(k): v for k, v in sorted(sous_zones.items())},
        "maps": {str(k): v for k, v in sorted(maps.items())},
    }
    (ROOT / "data" / "tacle.json").write_text(json.dumps(sortie, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    sans = len(ids_maps) - len(maps)
    print(f"{len(utiles)} monstres, {len(sous_zones)} sous-zones, {len(maps)} maps ({sans} sans sous-zone), invocations : {invocations}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]))
