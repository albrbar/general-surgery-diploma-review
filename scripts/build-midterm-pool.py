#!/usr/bin/env python3
"""Build the midterm practice/exam pool from existing sources only.

Inputs
  public/assets/mcq-answers/unified-bank.json   (lecture banks, Drive banks, Day 1-16, Telegram)
  docs/telegram/group2-inferred-answers.json    (answers inferred from posted Telegram explanations)

Output
  public/midterm/pool.json  (compact; one record per question)

Rules
  * No question or explanation is written here: text comes only from the source files.
  * Placeholder explanations ("pending review") are dropped so the UI can say so honestly.
  * Telegram questions are included only when an inferred answer exists and are flagged
    "unverified" so the UI can label them.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UNIFIED = ROOT / "public/assets/mcq-answers/unified-bank.json"
TELEGRAM = ROOT / "docs/telegram/group2-inferred-answers.json"
OUTPUT = ROOT / "public/midterm/pool.json"

SECTIONS = [
    {"id": "anatomy", "label": "Anatomy", "examCount": 5},
    {"id": "pathology", "label": "Pathology", "examCount": 5},
    {"id": "micro", "label": "Microbiology & Immunology", "examCount": 5},
    {"id": "pharm", "label": "Pharmacology", "examCount": 5},
    {"id": "principles", "label": "Principles of Surgery", "examCount": 20},
]
SECTION_ID = {
    "Anatomy": "anatomy",
    "Pathology": "pathology",
    "Microbiology and Immunology": "micro",
    "Microbiology & Immunology": "micro",
    "Pharmacology": "pharm",
    "Principles of Surgery": "principles",
}
TOPIC_ALIASES = {"ABD": "Abdomen", "BRST": "Breast"}
TELEGRAM_TOPICS = [
    (2, 10, "Breast"),
    (11, 20, "Thyroid & parathyroid"),
    (21, 30, "Arteries of the head & neck"),
    (31, 40, "Arteries of the upper limb"),
    (41, 50, "Arteries of the lower limb"),
    (51, 58, "Abdominal wall & inguinal region"),
]
PLACEHOLDER = re.compile(r"pending review|no additional explanation", re.I)


def clean_topic(topic: str) -> str:
    topic = TOPIC_ALIASES.get(topic, topic or "General")
    topic = re.sub(r"\.(pdf|pptx?|docx?)$", "", topic, flags=re.I)
    topic = re.sub(r"\s*-\s*copy$", "", topic, flags=re.I)
    return topic.strip() or "General"


def clean_explanation(text: str | None) -> str:
    if not text or PLACEHOLDER.search(text):
        return ""
    text = re.sub(r"\s*\n\s*\d{1,3}\s*$", "", text.strip())  # trailing page numbers from Telegram exports
    text = re.sub(r"(?<![.\n])\n(?!\n)", " ", text)  # re-flow hard-wrapped lines
    return re.sub(r"[ \t]+", " ", text).strip()


def difficulty(raw) -> str:
    raw = str(raw or "moderate").lower().strip()
    raw = {"medium": "moderate", "very easy": "easy", "very hard": "hard"}.get(raw, raw)
    return raw if raw in {"easy", "moderate", "hard"} else "moderate"


def main() -> None:
    bank = json.loads(UNIFIED.read_text(encoding="utf-8"))["questions"]
    inferred = json.loads(TELEGRAM.read_text(encoding="utf-8"))["answers"]
    pool, seen_stems = [], set()
    for q in bank:
        tg = q.get("origin") == "telegram-export"
        if tg:
            hit = inferred.get(q["id"])
            if not hit:
                continue
            idx = hit["correctOptionIndex"]
            num = int(q["id"].rsplit("-", 1)[1])
            topic = next((t for a, b, t in TELEGRAM_TOPICS if a <= num <= b), "Anatomy")
            section = "anatomy"
        else:
            if not q.get("eligibleForExam"):
                continue
            idx = q.get("correctOptionIndex")
            section = SECTION_ID.get(q.get("section"))
            topic = clean_topic(q.get("topic"))
        if section is None or not isinstance(idx, int) or not 0 <= idx < len(q["options"]):
            raise SystemExit(f"{q['id']}: bad section or answer index")
        stem_key = re.sub(r"\W+", "", q["stem"].lower())
        if stem_key in seen_stems:
            continue
        seen_stems.add(stem_key)
        item = {
            "id": q["id"],
            "s": section,
            "t": topic,
            "q": q["stem"].strip(),
            "o": [o.strip() for o in q["options"]],
            "a": idx,
            "d": difficulty(q.get("difficulty")),
            "e": clean_explanation(q.get("explanation")),
            "src": (q.get("source") or q.get("sourceFile") or "").strip(),
        }
        if q.get("sourceUrl"):
            item["url"] = q["sourceUrl"]
        if tg:
            item["src"] = "Telegram GS group 2 — posted question and explanation"
            item["flag"] = "unverified"
        pool.append(item)

    counts = {s["id"]: sum(1 for q in pool if q["s"] == s["id"]) for s in SECTIONS}
    for s in SECTIONS:
        s["count"] = counts[s["id"]]
        if s["count"] < s["examCount"]:
            raise SystemExit(f"{s['label']}: only {s['count']} questions")
    out = {
        "schemaVersion": 2,
        "title": "GS Diploma Midterm — question pool",
        "generatedFrom": [str(UNIFIED.relative_to(ROOT)), str(TELEGRAM.relative_to(ROOT))],
        "examLength": sum(s["examCount"] for s in SECTIONS),
        "sections": SECTIONS,
        "total": len(pool),
        "withExplanation": sum(1 for q in pool if q["e"]),
        "questions": pool,
    }
    OUTPUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{OUTPUT.relative_to(ROOT)}: {len(pool)} questions, {out['withExplanation']} with explanations, {counts}")


if __name__ == "__main__":
    main()
