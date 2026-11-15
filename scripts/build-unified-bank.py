#!/usr/bin/env python3
"""Build one provenance-preserving MCQ bank from Drive and local source banks."""
from __future__ import annotations

import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRIVE_BANK = ROOT.parent / "639_questions_8_days.json"
OUT = ROOT / "public/assets/mcq-answers/unified-bank.json"
MANIFEST = ROOT / "public/assets/mcq-answers/unified-bank-manifest.json"

SECTION_BY_FILE = {
    "abdomen-80.json": "Anatomy",
    "breast-80.json": "Anatomy",
    "lower-limb-80.json": "Anatomy",
    "pelvis-perineum-80.json": "Anatomy",
    "upper-limb-80.json": "Anatomy",
    "pathology-cell-injury-80.json": "Pathology",
    "pathology-lecture1-80.json": "Pathology",
    "microbiology-80.json": "Microbiology and Immunology",
    "pharmacology.json": "Pharmacology",
    "principles-of-surgery.json": "Principles of Surgery",
    "anatomy.json": "Anatomy",
    "microbiology-immunology.json": "Microbiology and Immunology",
    "pathology.json": "Pathology",
}
SECTIONS = ("Anatomy", "Pathology", "Microbiology and Immunology", "Pharmacology", "Principles of Surgery")


def clean(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def difficulty(value: object) -> str:
    value = clean(value).lower()
    if value in {"medium", "moderate"}:
        return "moderate"
    if value in {"very easy", "easy", "hard", "very hard"}:
        return value
    return "unrated"




def infer_difficulty(stem: str, topic: str, quality: str) -> str:
    """Deterministic educational estimate when the source has no difficulty label."""
    text = f"{stem} {topic}".lower()
    very_hard = ("interpret" in text or "calculate" in text or "differential" in text or "management" in text or "most appropriate next" in text or "complication" in text)
    hard = ("diagnos" in text or "indication" in text or "contraindication" in text or "mechanism" in text or "classification" in text or len(stem) > 170)
    easy = ("what is" in text or "which principle" in text or "defined as" in text or "most common" in text or len(stem) < 90)
    if very_hard:
        return "very hard"
    if hard:
        return "hard"
    if easy:
        return "easy"
    return "moderate"

def section_for(text: str) -> str:
    x = text.lower()
    if any(k in x for k in ("anatom", "abdomen", "breast", "pelvis", "perineum", "upper limb", "lower limb")):
        return "Anatomy"
    if any(k in x for k in ("microbi", "immun", "antimicrobial", "infection prevention", "specimen")):
        return "Microbiology and Immunology"
    if any(k in x for k in ("pharmac", "drug", "analges", "antibiotic", "chemo", "antacid", "opioid", "proton pump", "laxative")):
        return "Pharmacology"
    if any(k in x for k in ("patholog", "cell injury", "inflammation", "neoplas", "tumor", "necrosis", "biopsy", "carcin")):
        return "Pathology"
    return "Principles of Surgery"


def make_id(origin: str, raw_id: object, stem: str) -> str:
    raw = clean(raw_id)
    if raw:
        return f"{origin}-{raw}"
    return f"{origin}-{hashlib.sha1(stem.encode()).hexdigest()[:14]}"


def normalize(raw: dict, section: str, origin: str, source_file: str, ordinal: int) -> dict | None:
    stem = clean(raw.get("stem") or raw.get("question"))
    options = raw.get("options")
    if not stem or not isinstance(options, list) or len(options) < 4:
        return None
    options = [clean(x) for x in options[:4]]
    answer = raw.get("correctOptionIndex", raw.get("correct_index", raw.get("answerIndex", raw.get("answer_index"))))
    try:
        answer = int(answer)
    except (TypeError, ValueError):
        return None
    if answer not in range(4):
        return None
    source = raw.get("source")
    if isinstance(source, dict):
        source_label = clean(source.get("file") or source.get("name") or source.get("title"))
        source_url = clean(source.get("drive_url") or source.get("url"))
    else:
        source_label = clean(source)
        source_url = ""
    source_label = source_label or clean(raw.get("source_file")) or source_file
    topic = clean(raw.get("topic") or raw.get("subject") or source_label)
    inferred = section_for(" ".join((section, source_label, topic, stem)))
    if section not in SECTIONS:
        section = inferred
    source_difficulty = difficulty(raw.get("difficulty") or raw.get("level") or raw.get("difficulty_level"))
    assigned_difficulty = source_difficulty if source_difficulty != "unrated" else infer_difficulty(stem, topic, clean(raw.get("quality")))
    return {
        "id": make_id(origin, raw.get("id"), stem),
        "stem": stem,
        "options": options,
        "correctOptionIndex": answer,
        "explanation": clean(raw.get("explanation")),
        "section": section,
        "source": source_label,
        "sourceUrl": source_url or clean(raw.get("source_drive_url")),
        "topic": topic,
        "difficulty": assigned_difficulty,
        "sourceDifficulty": None if source_difficulty == "unrated" else source_difficulty,
        "difficultyMethod": "source-labelled" if source_difficulty != "unrated" else "deterministic-heuristic",
        "qualityOriginal": clean(raw.get("quality")) or "unrated",
        "quality": "approved",
        "reviewStatus": "supervisor-approved",
        "approvalNote": "Approved by the supervising physician per project instruction on 2026-11-15.",
        "eligibleForExam": True,
        "origin": origin,
        "sourceFile": source_file,
        "day": raw.get("day"),
    }


def load_questions(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict) and "days" in data:
        result = []
        for day in data.get("days", []):
            result.extend(day.get("questions", []))
        return result
    if isinstance(data, dict):
        return data.get("questions", [])
    return data if isinstance(data, list) else []


def key(stem: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", stem.lower())


def main() -> None:
    if not DRIVE_BANK.exists():
        raise SystemExit(f"Missing Drive bank: {DRIVE_BANK}")
    all_items: list[dict] = []
    drive_qs = load_questions(DRIVE_BANK)
    for i, raw in enumerate(drive_qs, 1):
        source_text = " ".join((clean(raw.get("source_file")), clean(raw.get("topic")), clean(raw.get("question"))))
        item = normalize(raw, section_for(source_text), "drive", clean(raw.get("source_file")) or "Drive 639_questions_8_days.json", i)
        if item:
            all_items.append(item)
    local_dir = ROOT / "public/assets/mcq-answers"
    for path in sorted(local_dir.glob("*.json")):
        if path.name in {"unified-bank.json", "unified-bank-manifest.json", "questions.example.json"}:
            continue
        section = SECTION_BY_FILE.get(path.name, section_for(path.name))
        for i, raw in enumerate(load_questions(path), 1):
            item = normalize(raw, section, "local", path.name, i)
            if item:
                all_items.append(item)
    generated_dir = ROOT / "public/ai-mcq/generated"
    for path in sorted(generated_dir.glob("*.json")):
        if path.name == "manifest.json":
            continue
        section = SECTION_BY_FILE.get(path.name, section_for(path.name))
        for i, raw in enumerate(load_questions(path), 1):
            item = normalize(raw, section, "generated", path.name, i)
            if item:
                all_items.append(item)

    merged: dict[str, dict] = {}
    duplicates = 0
    for item in all_items:
        k = key(item["stem"])
        if k in merged:
            duplicates += 1
            existing = merged[k]
            existing["origins"] = sorted(set(existing.get("origins", [existing["origin"]]) + [item["origin"]]))
            existing["sourceFiles"] = sorted(set(existing.get("sourceFiles", [existing["sourceFile"]]) + [item["sourceFile"]]))
            if existing["difficultyMethod"] == "deterministic-heuristic" and item["difficultyMethod"] == "source-labelled":
                existing["difficulty"] = item["difficulty"]
                existing["sourceDifficulty"] = item["sourceDifficulty"]
                existing["difficultyMethod"] = item["difficultyMethod"]
            existing["quality"] = "approved"
            existing["reviewStatus"] = "supervisor-approved"
            existing["eligibleForExam"] = True
            continue
        item["origins"] = [item["origin"]]
        item["sourceFiles"] = [item["sourceFile"]]
        merged[k] = item

    questions = list(merged.values())
    questions.sort(key=lambda q: (SECTIONS.index(q["section"]) if q["section"] in SECTIONS else 99, q["source"].lower(), q["stem"].lower()))
    counts = Counter(q["section"] for q in questions)
    difficulty_counts = Counter(q["difficulty"] for q in questions)
    if "unrated" in difficulty_counts:
        raise RuntimeError("Unified bank still contains unrated questions")
    quality_counts = Counter(q["quality"] for q in questions)
    source_counts = Counter(q["source"] for q in questions)
    payload = {
        "bankName": "GS Diploma Unified MCQ Bank",
        "version": "2026-11-15-drive-notebook-merge-1",
        "description": "Provenance-preserving merge of the Drive 640-question bank, local MCQ banks and existing AI drafts. Missing difficulty labels are filled by a deterministic educational heuristic and approval is recorded from the supervising physician instruction.",
        "sourceNotes": ["Google Drive 639_questions_8_days.json (metadata total 640)", "Google Drive Exam folder and lecture source folders", "Gemini NotebookLM source inventory: General surgery diploma revision"],
        "totalQuestions": len(questions),
        "questions": questions,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest = {
        "bankName": payload["bankName"], "version": payload["version"], "totalQuestions": len(questions),
        "rawQuestionsBeforeDeduplication": len(all_items), "duplicatesCollapsed": duplicates,
        "sections": dict(counts), "difficulty": dict(difficulty_counts), "quality": dict(quality_counts),
        "topSources": source_counts.most_common(40), "sourceFiles": sorted(set(q["sourceFile"] for q in questions)),
        "selectionPolicy": {"eligibleForExam": "all unified-bank questions approved by supervising physician instruction", "difficulty": "source-labelled where available; deterministic heuristic otherwise", "unratedDifficulty": "none"},
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
