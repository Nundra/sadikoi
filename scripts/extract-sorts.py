#!/usr/bin/env python3
"""Régénère data/sorts.json à partir de l'export communautaire dofus-sqlite.

Usage :
    python3 scripts/extract-sorts.py <dossier contenant dofus.sqlite et i18n_fr.json>

Les deux fichiers se téléchargent sur la dernière release de
https://github.com/ledouxm/dofus-sqlite (dofus.sqlite, i18n_fr.json).

Le rôle de chaque sort vis-à-vis de l'infection (applique, exploite, propage…)
n'est pas dans les données du jeu : il vient de data/infection-roles.json,
écrit à la main, et il est fusionné ici.
"""
import json
import sqlite3
import sys
from pathlib import Path

SADIDA = 10
ETAT_INFECTE = 263
ROOT = Path(__file__).resolve().parent.parent

# Formes de zone (zoneDescr.shape, code ASCII de la lettre utilisée par le jeu)
FORMES = {80: "point", 67: "cercle", 88: "croix", 76: "ligne", 84: "T", 65: "tout",
          71: "carre", 79: "anneau", 81: "croix_diag", 86: "cone", 82: "rectangle"}

# Bits de SpellLevelData.m_flags (cf. parser de dofus-sqlite)
F_EN_LIGNE, F_DIAGONALE, F_LDV, F_CASE_LIBRE, F_PO_MODIF = 1, 2, 4, 8, 64

# Invocations du Sadida (MonsterData, race 210)
INVOCATIONS = {5896: "La Folle", 5898: "La Sacrifiée", 5901: "Groute",
               5900: "Tréant", 5895: "La Bloqueuse", 5897: "La Gonflable",
               5899: "La Surpuissante", 5894: "Arbre"}


def main(src: Path) -> None:
    db = sqlite3.connect(src / "dofus.sqlite")
    textes = json.loads((src / "i18n_fr.json").read_text(encoding="utf-8"))
    tx = lambda i: textes.get(str(i), "")
    roles = json.loads((ROOT / "data" / "infection-roles.json").read_text(encoding="utf-8"))
    etats = {r[0]: tx(r[1]) for r in db.execute("SELECT id, nameId FROM SpellStateData")}
    effets_txt = {r[0]: tx(r[1]) for r in db.execute("SELECT id, descriptionId FROM EffectData")}

    def niveau_max(spell_id):
        row = db.execute("SELECT nameId, descriptionId, spellLevels FROM SpellData WHERE id=?", (spell_id,)).fetchone()
        lv = json.loads(row[2])[-1]
        cols = ("apCost", "minRange", "range", "maxCastPerTurn", "maxCastPerTarget",
                "minCastInterval", "initialCooldown", "minPlayerLevel", "m_flags", "effects")
        vals = dict(zip(cols, db.execute(f"SELECT {', '.join(cols)} FROM SpellLevelData WHERE id=?", (lv,)).fetchone()))
        return tx(row[0]), tx(row[1]).strip(), vals

    def rangs(spell_id):
        """Les rangs du sort : niveau du joueur qui le débloque, PA et PO (la PO grandit avec le rang)."""
        ids = json.loads(db.execute("SELECT spellLevels FROM SpellData WHERE id=?", (spell_id,)).fetchone()[0])
        out = []
        for lv in ids:
            niveau, pa, po_min, po_max = db.execute(
                "SELECT minPlayerLevel, apCost, minRange, range FROM SpellLevelData WHERE id=?", (lv,)).fetchone()
            out.append({"niveau": niveau, "pa": pa, "po_min": po_min, "po_max": po_max})
        return out

    def effets(raw):
        out = []
        for e in json.loads(raw):
            z = e["zoneDescr"]
            item = {
                "action": e["actionId"],
                "texte": effets_txt.get(e["actionId"], ""),
                "cibles": e["targetMask"],
                "zone": {"forme": FORMES.get(z["shape"], z["shape"]), "taille": z["param1"]},
                "duree": e["duration"],
                "declencheur": e["triggers"],
            }
            if e["actionId"] in (950, 951, 952):  # pose / retire / désactive un état
                item["etat"] = {"id": e["value"], "nom": etats.get(e["value"], "")}
            if e["actionId"] in (181, 405, 2796):  # invocations
                item["invocation"] = e["diceNum"]
            if e["actionId"] in (1160, 792, 2794):  # lance un sous-sort
                item["sous_sort"] = e["diceNum"]
            out.append(item)
        return out

    def fiche(spell_id, autre_id, paire):
        nom, desc, v = niveau_max(spell_id)
        f = v["m_flags"]
        fiche = {
            "id": spell_id,
            "nom": nom,
            "paire": paire,
            "variante_de": {"id": autre_id, "nom": niveau_max(autre_id)[0]},
            "niveau": v["minPlayerLevel"],
            "pa": v["apCost"],
            "po_min": v["minRange"],
            "po_max": v["range"],
            "po_modifiable": bool(f & F_PO_MODIF),
            "ligne_de_vue": bool(f & F_LDV),
            "en_ligne": bool(f & F_EN_LIGNE),
            "en_diagonale": bool(f & F_DIAGONALE),
            "case_libre": bool(f & F_CASE_LIBRE),
            "lancers_par_tour": v["maxCastPerTurn"] or None,
            "lancers_par_cible": v["maxCastPerTarget"] or None,
            "relance": v["minCastInterval"] or None,
            "relance_initiale": v["initialCooldown"] or None,  # > 0 : pas lançable au T1
            "description": desc,
            "effets": effets(v["effects"]),
            "rangs": rangs(spell_id),
        }
        fiche.update(roles.get(str(spell_id), {}))
        return fiche

    paires = db.execute(
        "SELECT v.id, group_concat(j.target_id) FROM SpellVariantData v "
        "JOIN SpellVariantData_spellIds_junction j ON j.SpellVariantData_id = v.id "
        "WHERE v.breedId = ? GROUP BY v.id ORDER BY v.id", (SADIDA,)).fetchall()
    sorts = []
    for paire, ids in paires:
        a, b = (int(x) for x in ids.split(","))
        sorts += [fiche(a, b, paire), fiche(b, a, paire)]

    invocations = []
    for mid, nom in INVOCATIONS.items():
        row = db.execute("SELECT grades, spells FROM MonsterData WHERE id=?", (mid,)).fetchone()
        grade = json.loads(row[0])[-1]
        invocations.append({
            "id": mid, "nom": nom,
            "pa": grade["actionPoints"], "pm": grade["movementPoints"],
            "sorts": [{"id": sid, "nom": n, "pa": v["apCost"], "po_min": v["minRange"], "po_max": v["range"],
                       "ligne_de_vue": bool(v["m_flags"] & F_LDV), "en_ligne": bool(v["m_flags"] & F_EN_LIGNE),
                       "en_diagonale": bool(v["m_flags"] & F_DIAGONALE), "case_libre": bool(v["m_flags"] & F_CASE_LIBRE),
                       "lancers_par_tour": v["maxCastPerTurn"] or None,
                       "lancers_par_cible": v["maxCastPerTarget"] or None,
                       "relance_initiale": v["initialCooldown"] or None, "description": d,
                       "effets": effets(v["effects"])}
                      for sid in json.loads(row[1]) for n, d, v in [niveau_max(sid)]],
        })

    out = {
        "source": "dofus-sqlite (github.com/ledouxm/dofus-sqlite), dernière release",
        "etat_infecte": {"id": ETAT_INFECTE, "nom": etats.get(ETAT_INFECTE, ""),
                         "exploitations_max_par_tour": 3},
        "sorts": sorts,
        # Ordre des sorts dans le grimoire du jeu (un par paire) : ordre par défaut de la barre
        "ordre": json.loads(db.execute("SELECT breedSpellsId FROM BreedData WHERE id=?", (SADIDA,)).fetchone()[0]),
        "invocations": invocations,
    }
    (ROOT / "data" / "sorts.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(sorts)} sorts, {len(invocations)} invocations → data/sorts.json")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]))
