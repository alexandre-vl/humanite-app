#!/usr/bin/env python3
"""Parse and validate the fictional mock corpus (mock/corpus/*.md).

Usage:
    python3 mock/tools/corpus.py mock/corpus/politique.md [mock/corpus/social-eco.md ...]

Files passed together form one link scope: `::related` and `[..](article:id)` may point
across them. Exit code 1 when any error is found.
"""
from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

# id -> (code, label, order). Order follows the app's category bar (captures 02, 17);
# "environnement" and "sport" are assumed, the bar was cut after "FÉMINISM…".
RUBRIQUES: dict[str, tuple[str, str, int]] = {
    "politique": ("pol", "Politique", 1),
    "social-eco": ("eco", "Social Éco", 2),
    "societe": ("soc", "Société", 3),
    "monde": ("mon", "Monde", 4),
    "culture-et-savoir": ("cul", "Culture et savoir", 5),
    "feminisme": ("fem", "Féminisme", 6),
    "environnement": ("env", "Environnement", 7),
    "sport": ("spo", "Sport", 8),
}

# Fictional newsroom. id -> (name, rubrique, is_columnist)
AUTHORS: dict[str, tuple[str, str, bool]] = {
    "lucie-varenne": ("Lucie Varenne", "politique", False),
    "karim-belhadj": ("Karim Belhadj", "politique", False),
    "marion-castel": ("Marion Castel", "social-eco", False),
    "julien-ferrand": ("Julien Ferrand", "social-eco", False),
    "bernard-quillet": ("Bernard Quillet", "social-eco", True),
    "nadia-oussedik": ("Nadia Oussedik", "societe", False),
    "thomas-lecuyer": ("Thomas Lécuyer", "societe", False),
    "elise-morvan": ("Élise Morvan", "monde", False),
    "samir-haddad": ("Samir Haddad", "monde", False),
    "yves-kerlan": ("Yves Kerlan", "monde", True),
    "helene-marchetti": ("Hélène Marchetti", "culture-et-savoir", False),
    "paul-delorme": ("Paul Delorme", "culture-et-savoir", False),
    "odile-sarrazin": ("Odile Sarrazin", "culture-et-savoir", True),
    "claire-vasseur": ("Claire Vasseur", "feminisme", False),
    "ines-benali": ("Inès Benali", "feminisme", False),
    "hugo-lambert": ("Hugo Lambert", "environnement", False),
    "lea-fontanel": ("Léa Fontanel", "environnement", False),
    "maxime-renaud": ("Maxime Renaud", "sport", False),
    "sofia-laurenti": ("Sofia Laurenti", "sport", False),
}

# Per-file quotas of special formats.
EXPECTED: dict[str, dict[str, int]] = {
    "politique": {"video": 1, "column": 0, "callout": 0},
    "social-eco": {"video": 0, "column": 1, "callout": 0},
    "societe": {"video": 0, "column": 0, "callout": 0},
    "monde": {"video": 1, "column": 1, "callout": 0},
    "culture-et-savoir": {"video": 1, "column": 1, "callout": 1},
    "feminisme": {"video": 0, "column": 0, "callout": 0},
    "environnement": {"video": 0, "column": 0, "callout": 0},
    "sport": {"video": 1, "column": 0, "callout": 0},
}

REQUIRED = ("id", "kind", "rubrique", "format", "access", "title", "chapo", "authors", "published", "tags")
OPTIONAL = ("hero", "emphasis")
WINDOW = (datetime(2026, 9, 10, 7, 0), datetime(2026, 9, 13, 9, 55))
# (min, max) words accepted; the brief asks for a narrower range, these leave some slack.
WORDS = {"article": (300, 800), "video": (120, 420), "column": (350, 700), "brief": (50, 180)}

LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")
IMAGE_RE = re.compile(r"^!\[([^\]|]+)\|([^\]]+)\]\((photo|photo:portrait)\)$")


@dataclass
class Block:
    line: int
    kind: str  # paragraph | heading | quote | image | video | related | callout
    lines: list[str]


@dataclass
class Item:
    file: Path
    line: int
    meta: dict[str, str]
    blocks: list[Block]

    @property
    def id(self) -> str:
        return self.meta.get("id", f"?{self.file.name}:{self.line}")

    @property
    def kind(self) -> str:
        return "brief" if self.meta.get("kind") == "brief" else self.meta.get("format", "article")


def strip_marks(text: str) -> str:
    text = LINK_RE.sub(r"\1", text)
    return text.replace("**", "").replace("*", "")


def word_count(item: Item) -> int:
    n = 0
    for b in item.blocks:
        if b.kind in ("paragraph", "heading", "quote"):
            for ln in b.lines:
                n += len(re.findall(r"\w+", strip_marks(ln.lstrip(">#— ").strip())))
    return n


def classify(first: str) -> str:
    if first.startswith("## "):
        return "heading"
    if first.startswith(">"):
        return "quote"
    if IMAGE_RE.match(first):
        return "image"
    for d in ("video", "related", "callout"):
        if first.startswith(f"::{d} "):
            return d
    if first.startswith("::"):
        return "bad-directive"
    if first.startswith("#") or first.startswith("!["):
        return "bad-syntax"
    return "paragraph"


def parse_file(path: Path) -> tuple[list[Item], list[str]]:
    lines = path.read_text(encoding="utf-8").splitlines()
    items: list[Item] = []
    errors: list[str] = []
    i = 0
    while i < len(lines) and not lines[i].strip():
        i += 1
    while i < len(lines):
        if lines[i].strip() != "---":
            errors.append(f"{path.name}:{i + 1}: attendu '---' pour ouvrir un item, trouvé {lines[i][:50]!r}")
            while i < len(lines) and lines[i].strip() != "---":
                i += 1
            continue
        start, i = i + 1, i + 1
        meta: dict[str, str] = {}
        while i < len(lines) and lines[i].strip() != "---":
            ln = lines[i]
            if ln.strip():
                m = re.match(r"^([a-z]+):\s*(.*)$", ln)
                if not m:
                    errors.append(f"{path.name}:{i + 1}: ligne de front matter invalide {ln[:60]!r}")
                elif m.group(1) in meta:
                    errors.append(f"{path.name}:{i + 1}: clé en double '{m.group(1)}'")
                else:
                    meta[m.group(1)] = m.group(2).strip()
            i += 1
        if i >= len(lines):
            errors.append(f"{path.name}:{start}: front matter jamais fermé")
            break
        i += 1
        blocks: list[Block] = []
        cur: list[tuple[int, str]] = []
        while i <= len(lines):
            ln = lines[i] if i < len(lines) else ""
            end = i >= len(lines) or ln.strip() == "---"
            if ln.strip() and not end:
                cur.append((i + 1, ln.rstrip()))
            elif cur:
                blocks.append(Block(cur[0][0], classify(cur[0][1]), [t for _, t in cur]))
                cur = []
            if end:
                break
            i += 1
        items.append(Item(path, start, meta, blocks))
    return items, errors


def validate_item(item: Item, rubrique: str, scope_ids: set[str]) -> list[str]:
    e: list[str] = []
    where = f"{item.file.name}:{item.line} [{item.id}]"
    m = item.meta
    for k in REQUIRED:
        if not m.get(k):
            e.append(f"{where}: clé manquante '{k}'")
    for k in m:
        if k not in REQUIRED and k not in OPTIONAL:
            e.append(f"{where}: clé inconnue '{k}'")
    code = RUBRIQUES[rubrique][0]
    idm = re.fullmatch(rf"{code}-(a[1-6]|b[1-3])", m.get("id", ""))
    if not idm:
        e.append(f"{where}: id attendu {code}-a1…a6 ou {code}-b1…b3")
    elif (idm.group(1)[0] == "b") != (m.get("kind") == "brief"):
        e.append(f"{where}: préfixe d'id et kind incohérents")
    if m.get("kind") not in ("article", "brief"):
        e.append(f"{where}: kind doit être article|brief")
    if m.get("rubrique") != rubrique:
        e.append(f"{where}: rubrique '{m.get('rubrique')}' ≠ fichier '{rubrique}'")
    fmt = m.get("format")
    if fmt not in ("article", "video", "column"):
        e.append(f"{where}: format doit être article|video|column")
    if m.get("kind") == "brief" and fmt != "article":
        e.append(f"{where}: une brève a format: article")
    if m.get("access") not in ("free", "premium"):
        e.append(f"{where}: access doit être free|premium")
    if not 50 <= len(m.get("title", "")) <= 140:
        e.append(f"{where}: title {len(m.get('title', ''))} car. (50–140)")
    if m.get("title", "").isupper():
        e.append(f"{where}: title en capitales (écrire en casse normale)")
    if not 150 <= len(m.get("chapo", "")) <= 300:
        e.append(f"{where}: chapo {len(m.get('chapo', ''))} car. (150–300)")

    authors = [a.strip() for a in m.get("authors", "").split(",") if a.strip()]
    for a in authors:
        if a not in AUTHORS:
            e.append(f"{where}: auteur inconnu '{a}'")
    known = [a for a in authors if a in AUTHORS]
    if fmt == "column":
        if len(authors) != 1 or not (known and AUTHORS[known[0]][2] and AUTHORS[known[0]][1] == rubrique):
            e.append(f"{where}: une chronique a exactement 1 auteur, le chroniqueur de la rubrique")
    else:
        if not 1 <= len(authors) <= 2 or any(AUTHORS[a][2] or AUTHORS[a][1] != rubrique for a in known):
            e.append(f"{where}: 1 ou 2 auteurs non chroniqueurs de la rubrique")

    try:
        pub = datetime.strptime(m.get("published", ""), "%Y-%m-%d %H:%M")
        if not WINDOW[0] <= pub <= WINDOW[1]:
            e.append(f"{where}: published hors fenêtre 2026-09-10 07:00 → 2026-09-13 09:55")
    except ValueError:
        e.append(f"{where}: published attendu YYYY-MM-DD HH:MM")
    tags = [t for t in m.get("tags", "").split(",") if t.strip()]
    if not 2 <= len(tags) <= 4:
        e.append(f"{where}: 2 à 4 tags")

    hero = m.get("hero")
    if hero is not None and len([p for p in hero.split("|") if p.strip()]) != 2:
        e.append(f"{where}: hero attendu 'légende | crédit'")
    if fmt in ("article", "video") and m.get("kind") == "article" and not hero:
        e.append(f"{where}: hero obligatoire pour article/vidéo")
    if fmt == "column" and hero:
        e.append(f"{where}: pas de hero pour une chronique")
    if "emphasis" in m and (m["emphasis"] != "true" or m.get("kind") != "brief"):
        e.append(f"{where}: emphasis: true uniquement sur une brève")

    kinds = [b.kind for b in item.blocks]
    if not item.blocks:
        e.append(f"{where}: corps vide")
    for b in item.blocks:
        bw = f"{item.file.name}:{b.line} [{item.id}]"
        if b.kind in ("bad-directive", "bad-syntax"):
            e.append(f"{bw}: syntaxe de bloc inconnue {b.lines[0][:50]!r}")
        if len(b.lines) > 1 and not (b.kind == "quote" and len(b.lines) == 2 and b.lines[1].startswith("> — ")):
            e.append(f"{bw}: bloc sur plusieurs lignes (seule une citation peut avoir '> — Source' en 2e ligne)")
        if b.kind == "quote" and not b.lines[0].startswith("> "):
            e.append(f"{bw}: citation attendue '> texte'")
        if b.kind == "related":
            target = b.lines[0].split(maxsplit=1)[1].strip()
            if target == item.id or target not in scope_ids:
                e.append(f"{bw}: ::related vers id inexistant ou lui-même '{target}'")
        if b.kind == "video" and not re.fullmatch(r"::video .+ \| \d{1,2}:\d{2}", b.lines[0]):
            e.append(f"{bw}: ::video attendu 'Titre | m:ss'")
        if b.kind == "callout" and len([p for p in b.lines[0][len('::callout '):].split("|") if p.strip()]) != 3:
            e.append(f"{bw}: ::callout attendu 'TITRE | Texte | Bouton'")
        for ln in b.lines:
            for _, href in LINK_RE.findall(ln):
                if href.startswith("article:"):
                    if href[8:] not in scope_ids or href[8:] == item.id:
                        e.append(f"{bw}: lien interne vers id inexistant '{href}'")
                elif not href.startswith("https://example.org/"):
                    e.append(f"{bw}: lien externe hors https://example.org/ '{href}'")
    if fmt == "video" and (not kinds or kinds[0] != "video"):
        e.append(f"{where}: un item video commence par ::video")
    if kinds.count("video") > (1 if fmt == "video" else 0):
        e.append(f"{where}: ::video seulement en 1er bloc d'un item video")
    if m.get("kind") == "brief" and set(kinds) - {"paragraph"}:
        e.append(f"{where}: une brève ne contient que des paragraphes")
    if m.get("kind") == "brief" and len(item.blocks) > 3:
        e.append(f"{where}: une brève a 1 à 3 paragraphes")
    if fmt == "column" and "image" in kinds:
        e.append(f"{where}: pas d'image dans une chronique")
    if m.get("kind") == "article" and fmt == "article" and "heading" not in kinds:
        e.append(f"{where}: au moins un intertitre ## dans un article")

    lo, hi = WORDS[item.kind]
    wc = word_count(item)
    if not lo <= wc <= hi:
        e.append(f"{where}: {wc} mots pour {item.kind} (accepté {lo}–{hi})")
    return e


def validate_file(path: Path, items: list[Item], scope_ids: set[str]) -> list[str]:
    rubrique = path.stem
    if rubrique not in RUBRIQUES:
        return [f"{path.name}: nom de fichier ≠ id de rubrique ({', '.join(RUBRIQUES)})"]
    e: list[str] = []
    for it in items:
        e += validate_item(it, rubrique, scope_ids)
    arts = [it for it in items if it.meta.get("kind") == "article"]
    briefs = [it for it in items if it.meta.get("kind") == "brief"]
    if len(arts) != 6 or len(briefs) != 3:
        e.append(f"{path.name}: {len(arts)} articles / {len(briefs)} brèves (attendu 6 / 3)")
    if sum(it.meta.get("access") == "premium" for it in arts) != 2:
        e.append(f"{path.name}: exactement 2 articles premium attendus")
    if sum(it.meta.get("emphasis") == "true" for it in briefs) != 1:
        e.append(f"{path.name}: exactement 1 brève emphasis: true attendue")
    exp = EXPECTED[rubrique]
    got = {
        "video": sum(it.meta.get("format") == "video" for it in items),
        "column": sum(it.meta.get("format") == "column" for it in items),
        "callout": sum(b.kind == "callout" for it in items for b in it.blocks),
    }
    for k, v in exp.items():
        if got[k] != v:
            e.append(f"{path.name}: {got[k]} {k} (attendu {v})")
    allb = [b for it in items for b in it.blocks]
    text = "\n".join(ln for b in allb for ln in b.lines)
    checks = {
        "intertitre ##": any(b.kind == "heading" for b in allb),
        "citation avec '> — Source'": any(b.kind == "quote" and len(b.lines) == 2 for b in allb),
        "image ![..](photo)": any(b.kind == "image" for b in allb),
        "::related": any(b.kind == "related" for b in allb),
        "lien interne (article:id)": "](article:" in text,
        "lien externe example.org": "](https://example.org/" in text,
        "*italique*": re.search(r"(?<!\*)\*[^*\n]+\*(?!\*)", text) is not None,
    }
    for label, ok in checks.items():
        if not ok:
            e.append(f"{path.name}: aucun {label} dans le fichier")
    return e


def load_scope(paths: list[Path]) -> tuple[list[Item], list[str]]:
    items: list[Item] = []
    errors: list[str] = []
    per_file: list[tuple[Path, list[Item]]] = []
    for p in paths:
        its, errs = parse_file(p)
        per_file.append((p, its))
        items += its
        errors += errs
    ids = [it.id for it in items]
    for dup in sorted({i for i in ids if ids.count(i) > 1}):
        errors.append(f"id en double: {dup}")
    scope = set(ids)
    for p, its in per_file:
        errors += validate_file(p, its, scope)
    return items, errors


def main(argv: list[str]) -> int:
    paths = [Path(a) for a in argv]
    if not paths:
        print(__doc__)
        return 2
    items, errors = load_scope(paths)
    for p in paths:
        its = [it for it in items if it.file == p]
        words = sum(word_count(it) for it in its)
        fmts = {k: sum(it.kind == k for it in its) for k in ("article", "video", "column", "brief")}
        print(f"{p.name}: {len(its)} items, {words} mots, {fmts}")
    for err in errors:
        print(f"✗ {err}")
    print("✓ corpus valide" if not errors else f"{len(errors)} erreur(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
