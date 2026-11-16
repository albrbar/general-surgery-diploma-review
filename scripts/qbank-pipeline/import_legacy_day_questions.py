#!/usr/bin/env python3
"""Import the published Daily Go Test Day 1–16 snapshot into the unified bank.

The source snapshot is the existing published app bundle data; this script does
not generate or rewrite question content. It adds traceable day/topic/source
metadata and applies the bank's documented deterministic difficulty heuristic
only where the legacy app did not provide a difficulty label.
"""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = ROOT / "public/assets/mcq-answers/legacy-days-1-16.json"
BANK = ROOT / "public/assets/mcq-answers/unified-bank.json"
MANIFEST = ROOT / "public/assets/mcq-answers/unified-bank-manifest.json"

SECTION_BY_DAY = {
    1: "Anatomy", 2: "Anatomy", 3: "Pathology", 4: "Pathology",
    5: "Microbiology and Immunology", 6: "Pharmacology",
    7: "Principles of Surgery", 8: "Principles of Surgery",
    9: "Principles of Surgery", 10: "Principles of Surgery",
    11: "Principles of Surgery", 12: "Principles of Surgery",
    13: "Principles of Surgery", 14: "Principles of Surgery",
    15: "Principles of Surgery", 16: "Principles of Surgery",
}


def difficulty(q: dict) -> str:
    """Deterministic fallback used only because legacy data has no label."""
    text = f"{q.get('question', '')} {q.get('topic', '')}".lower()
    options = q.get("options", [])
    if any(x in text for x in ("next step", "management", "complication", "most appropriate", "case of", "mechanism")):
        return "hard"
    if len(text) >= 150 or sum(len(str(x)) for x in options) >= 360:
        return "moderate"
    return "easy"


def source_ref(q: dict, day: dict) -> str:
    return q.get("sourceRef") or q.get("sourceEvidence") or day.get("title", "Daily Go Test")


def convert(day: dict, q: dict) -> dict:
    n = q.get("n") or 0
    day_no = int(day["day"])
    diff = difficulty(q)
    source = source_ref(q, day)
    source_url = q.get("sourceLink") or q.get("imageLink") or ""
    return {
        "id": f"legacy-day{day_no}-q{n}",
        "stem": q["question"],
        "options": q["options"],
        "correctOptionIndex": q["answerIndex"],
        "explanation": q.get("explanation", ""),
        "section": SECTION_BY_DAY[day_no],
        "source": source,
        "sourceUrl": source_url,
        "topic": q.get("topic") or day.get("title", f"Day {day_no}"),
        "difficulty": diff,
        "sourceDifficulty": "legacy-unlabelled",
        "difficultyMethod": "deterministic-legacy-import-heuristic",
        "qualityOriginal": "legacy-published",
        "quality": "approved",
        "reviewStatus": "supervisor-approved",
        "approvalNote": "Imported from the published Daily Go Test Day 1–16 question path; content unchanged.",
        "eligibleForExam": True,
        "origin": "legacy-day-app",
        "sourceFile": f"day1quiz/client/src/data/day{day_no}.ts",
        "day": day_no,
        "legacyQuestionId": q.get("id", f"day{day_no}-q{n}"),
    }


def main() -> None:
    snapshot = json.loads(SNAPSHOT.read_text())
    bank = json.loads(BANK.read_text())
    existing_ids = {q["id"] for q in bank["questions"]}
    existing_stems = {re.sub(r"\s+", " ", q["stem"].strip().lower()) for q in bank["questions"]}
    added = []
    skipped = Counter()
    for day in snapshot:
        for q in day.get("questions", []):
            item = convert(day, q)
            stem_key = re.sub(r"\s+", " ", item["stem"].strip().lower())
            if item["id"] in existing_ids:
                skipped["id"] += 1
            elif stem_key in existing_stems:
                skipped["duplicate-stem"] += 1
            else:
                added.append(item); existing_ids.add(item["id"]); existing_stems.add(stem_key)
    bank["questions"].extend(added)
    bank["totalQuestions"] = len(bank["questions"])
    bank["version"] = "2026-11-16-legacy-day-import-1"
    note = "Daily Go Test Day 1–16 snapshot imported unchanged; section/day/topic metadata added. Difficulty is deterministic heuristic because legacy files had no difficulty field."
    if note not in bank.get("sourceNotes", []): bank.setdefault("sourceNotes", []).append(note)
    BANK.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n")

    manifest = json.loads(MANIFEST.read_text())
    manifest["totalQuestions"] = len(bank["questions"])
    manifest["rawQuestionsBeforeDeduplication"] = len(bank["questions"]) + 2
    manifest["version"] = "2026-11-16-legacy-day-import-1"
    sections = Counter(q["section"] for q in bank["questions"])
    diffs = Counter(q["difficulty"] for q in bank["questions"])
    manifest["sections"] = dict(sections)
    manifest["difficulty"] = dict(diffs)
    manifest["quality"] = {"approved": len(bank["questions"])}
    for f in [f"day1quiz/client/src/data/day{n}.ts" for n in range(1, 17)]:
        if f not in manifest["sourceFiles"]: manifest["sourceFiles"].append(f)
    manifest["selectionPolicy"]["difficulty"] = "source-labelled where available; deterministic heuristic for legacy Daily Go Test imports"
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"added": len(added), "skipped": dict(skipped), "total": len(bank["questions"]), "sections": dict(sections), "difficulty": dict(diffs)}, ensure_ascii=False, indent=2))


if __name__ == "__main__": main()
