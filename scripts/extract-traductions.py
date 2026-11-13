#!/usr/bin/env python3
"""Régénère data/traductions/<langue>.json : les textes du jeu en anglais et en espagnol.

Usage :
    python3 scripts/extract-traductions.py <dossier dofus-sqlite>

Le dossier contient dofus.sqlite et i18n_fr.json, i18n_en.json, i18n_es.json, téléchargés sur
la dernière release de https://github.com/ledouxm/dofus-sqlite.

Pour chaque langue :
- sorts : id du sort → { nom, description } (Sadida et invocations, data/sorts.json) ;
- invocations : id du monstre → nom ;
- noms : texte français → traduction, pour les noms de maps, sous-zones, zones, donjons, boss
  (data/maps.json) et monstres dessinés (data/portraits.json). Ces noms se répètent beaucoup,
  une table de correspondance reste petite.
Les textes écrits à la main (rôles d'infection, interface) sont traduits dans app/i18n/.
"""
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LANGUES = ["en", "es"]


def main(src: Path) -> None:
    db = sqlite3.connect(src / "dofus.sqlite")
    fr = json.loads((src / "i18n_fr.json").read_text(encoding="utf-8"))
    sorts = json.loads((ROOT / "data" / "sorts.json").read_text(encoding="utf-8"))
    maps = json.loads((ROOT / "data" / "maps.json").read_text(encoding="utf-8"))["maps"]
    portraits = json.loads((ROOT / "data" / "portraits.json").read_text(encoding="utf-8"))

    ids_sorts = [s["id"] for s in sorts["sorts"]] + [s["id"] for i in sorts["invocations"] for s in i["sorts"]]
    ids_invocations = [i["id"] for i in sorts["invocations"]]

    # Tous les nameId des noms de lieux et de monstres affichés
    noms = set()
    for m in maps:
        row = db.execute("SELECT nameId, subAreaId FROM MapInformationData WHERE id=?", (m["id"],)).fetchone()
        if not row:
            continue
        noms.add(row[0])
        sz = db.execute("SELECT nameId, areaId FROM SubAreaData WHERE id=?", (row[1],)).fetchone()
        if sz:
            noms.add(sz[0])
            area = db.execute("SELECT nameId FROM AreaData WHERE id=?", (sz[1],)).fetchone()
            if area:
                noms.add(area[0])
    for nid, bosses in db.execute("SELECT nameId, bosses FROM DungeonData"):
        noms.add(nid)
        for b in json.loads(bosses):
            noms.update(r[0] for r in db.execute("SELECT nameId FROM MonsterData WHERE id=?", (b,)))
    for e in portraits["ennemis"]:
        noms.update(r[0] for r in db.execute("SELECT nameId FROM MonsterData WHERE id=?", (e["id"],)))

    sortie = ROOT / "data" / "traductions"
    sortie.mkdir(parents=True, exist_ok=True)
    for langue in LANGUES:
        t = json.loads((src / f"i18n_{langue}.json").read_text(encoding="utf-8"))
        tx = lambda i: t.get(str(i), "")
        out = {"sorts": {}, "invocations": {}, "noms": {}}
        for sid in ids_sorts:
            n, d = db.execute("SELECT nameId, descriptionId FROM SpellData WHERE id=?", (sid,)).fetchone()
            out["sorts"][str(sid)] = {"nom": tx(n), "description": tx(d).strip()}
        for mid in ids_invocations:
            (n,) = db.execute("SELECT nameId FROM MonsterData WHERE id=?", (mid,)).fetchone()
            out["invocations"][str(mid)] = tx(n)
        for n in sorted(x for x in noms if x):
            a, b = fr.get(str(n)), tx(n)
            if a and b and a != b:
                out["noms"][a] = b
        (sortie / f"{langue}.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(f"{langue} : {len(out['sorts'])} sorts, {len(out['invocations'])} invocations, {len(out['noms'])} noms → data/traductions/{langue}.json")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]))
