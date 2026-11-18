"""Normalize the TSL, NGSL, BSL and pinned FVDP sources with Python's standard library."""
import argparse
import csv
import hashlib
import html
import io
import json
import re
import sqlite3
import xml.etree.ElementTree as xml
import zipfile
from pathlib import Path

BASE = "https://www.newgeneralservicelist.com/s/"
BOOKS = {
    "tsl": ("TSL_12_stats.csv", "TSL_12_definitions.xlsx", "TSL_12_lemmatized_for_teaching.csv"),
    "ngsl": ("NGSL_12_stats.csv", "NGSL_12_with_English_definitions.xlsx", "NGSL_12_lemmatized_for_teaching.csv"),
    "bsl": ("BSL_120_stats.csv", None, "BSL_120_lemmatized_for_teaching.csv"),
}
FVDP_SHA256 = "b030f464e3b451e410fbde74f354fead17ca19bf8ac6dda05a224f025cfe5dcc"
FVDP_URL = "https://github.com/tecxmate/vnme-data/releases/download/v1.0.0/vn_en_dictionary.db"
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
POS = {
    "danh từ": "noun", "động từ": "verb", "nội động từ": "verb", "ngoại động từ": "verb",
    "tính từ": "adjective", "phó từ": "adverb", "trạng từ": "adverb", "giới từ": "preposition",
    "liên từ": "conjunction", "đại từ": "pronoun", "mạo từ": "article", "thán từ": "interjection",
    "số từ": "numeral", "trợ động từ": "auxiliary", "từ hạn định": "determiner",
}


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def csv_rows(path):
    raw_csv = path.read_bytes()
    try:
        text = raw_csv.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw_csv.decode("windows-1252")
    return list(csv.reader(io.StringIO(text, newline="")))


def definitions(path):
    with zipfile.ZipFile(path) as source:
        strings = [
            "".join(value.itertext()) for value in xml.fromstring(source.read("xl/sharedStrings.xml"))
        ]
        rows = xml.fromstring(source.read("xl/worksheets/sheet1.xml")).findall(".//s:row", NS)

    def cell(row, column):
        node = next((item for item in row if re.fullmatch(column + r"\d+", item.get("r", ""))), None)
        value = node.find("s:v", NS) if node is not None else None
        return strings[int(value.text)].strip() if value is not None and node.get("t") == "s" else None

    return {word.lower(): gloss for row in rows[1:] if (word := cell(row, "A")) and (gloss := cell(row, "B"))}


def plain(fragment):
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", fragment)).split())


def glosses(fragment):
    groups = re.split(r"<ul>|</ul>", fragment, flags=re.IGNORECASE)
    for index in range(1, len(groups), 2):
        label = re.findall(r"<i>([^<]+)</i>", groups[index - 1], re.IGNORECASE)
        heading = plain(label[-1]).lower() if label else ""
        pos = next((name for key, name in POS.items() if heading.startswith(key)), "unclassified")
        for row in re.split(r"<li>", groups[index], flags=re.IGNORECASE)[1:]:
            text, sep, rest = row.partition("</li>")
            gloss = plain(text)
            if not sep or not gloss or len(gloss) > 420:
                continue
            examples = []
            for en, vi in re.findall(r"<b>(.*?)</b>\s*:\s*<i>(.*?)</i>", rest, re.IGNORECASE | re.DOTALL):
                english, vietnamese = plain(en), plain(vi)
                if english and vietnamese and all(item["en"] != english for item in examples):
                    examples.append({"en": english, "vi": vietnamese})
            yield pos, gloss, examples


def load_fvdp(path, keys):
    if digest(path) != FVDP_SHA256:
        raise ValueError("Unexpected FVDP mirror hash")

    selected = {}
    with sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True) as database:
        database.execute("PRAGMA trusted_schema=OFF")
        rows = database.execute("""
            SELECT w.word, m.meaning_text FROM meanings m
            JOIN words w ON w.id = m.word_id
            JOIN sources s ON s.id = m.source_id
            WHERE s.name = 'FVDP (GPL)' ORDER BY w.word, m.id
        """)
        for word, text in rows:
            lemma = word.lower().strip()
            if lemma not in keys:
                continue
            bag = selected.setdefault(lemma, {})
            for pos, gloss, examples in glosses(text):
                key = (pos, gloss.casefold())
                if key not in bag or len(bag[key]["examples"]) < len(examples):
                    bag[key] = {"pos": pos, "vi": gloss, "examples": examples}
    return {lemma: list(bag.values()) for lemma, bag in selected.items() if bag}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    listings, inputs = {}, {}
    for name, (csv_file, xlsx_file, forms_file) in BOOKS.items():
        paths = [args.directory / file for file in (csv_file, xlsx_file, forms_file) if file]
        inputs[name] = [{"url": BASE + path.name, "sha256": digest(path)} for path in paths]
        gloss = definitions(args.directory / xlsx_file) if xlsx_file else {}
        forms = {}
        for row in csv_rows(args.directory / forms_file):
            if row and (key := row[0].strip().lower()) and not key.startswith("#"):
                forms.setdefault(key, []).extend(form.strip() for form in row[1:] if form.strip())
        listings[name] = [
            {"lemma": key, "rank": int(row[1]), "definition": gloss.get(key), "forms": forms.get(key, [])}
            for row in csv_rows(args.directory / csv_file)[1:]
            if len(row) > 1 and (key := row[0].strip().lower()) and row[1].strip().isdigit()
        ]

    keys = set(entry["lemma"] for entries in listings.values() for entry in entries)
    entries = load_fvdp(args.directory / "vn_en_dictionary.db", keys)
    inputs["fvdp"] = [{"url": FVDP_URL, "sha256": FVDP_SHA256}]
    payload = {"sources": inputs, "lists": listings, "glossary": entries}
    args.output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print("Lists:", {key: len(rows) for key, rows in listings.items()}, "FVDP headwords:", len(entries))


if __name__ == "__main__":
    main()
