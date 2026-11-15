#!/usr/bin/env python3
"""Build the 80-item midterm bank from existing GitHub question assets only."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets/mcq-answers"
OUTPUT = ROOT / "public/midterm/questions.json"


def load(name: str) -> list[dict]:
    data = json.loads((ASSETS / name).read_text(encoding="utf-8"))
    return data["questions"]


def pick(items: list[dict], predicate, count: int, label: str) -> list[dict]:
    chosen = [item for item in items if predicate(item)]
    if len(chosen) < count:
        raise SystemExit(f"{label}: requested {count}, found {len(chosen)}")
    return chosen[:count]


def normalize(item: dict, number: int, section: str, section_ar: str, source_file: str) -> dict:
    correct_index = item.get("correctOptionIndex", item.get("answer_index"))
    if not isinstance(correct_index, int) or correct_index not in range(4):
        raise SystemExit(f"{item.get('id')}: invalid answer index")
    item_id = item["id"]
    if str(item_id).startswith("notebooklm-"):
        item_id = f"{Path(source_file).stem}-{item_id}"
    raw_difficulty = str(item.get("difficulty", "moderate")).strip().lower()
    difficulty = {
        "medium": "moderate",
        "moderate": "moderate",
        "very easy": "easy",
        "very hard": "hard",
        "easy": "easy",
        "hard": "hard",
    }.get(raw_difficulty, "moderate")
    return {
        "number": number,
        "id": item_id,
        "section": section,
        "sectionAr": section_ar,
        "topic": item.get("topic", "General"),
        "stem": item["stem"],
        "options": item["options"],
        "correctOptionIndex": correct_index,
        "difficulty": difficulty,
        "explanation": item.get("explanation", ""),
        "status": item.get("status", "unknown"),
        "clinicalReference": item.get("clinicalReference") or {
            "source": item.get("source"),
            "reviewStatus": item.get("clinicalReviewStatus", "not-recorded"),
        },
        "source": item.get("source") or item.get("origin_file"),
        "sourceFile": source_file,
        "tags": item.get("tags", []),
    }


selected: list[tuple[dict, str, str, str]] = []

# 5 Anatomy items from the approved Anatomy 03 banks.
for filename, label in [
    ("abdomen-80.json", "Abdomen"),
    ("pelvis-perineum-80.json", "Pelvis & Perineum"),
    ("breast-80.json", "Breast"),
    ("upper-limb-80.json", "Upper Limb"),
    ("lower-limb-80.json", "Lower Limb"),
]:
    items = load(filename)
    if len(selected) >= 5:
        break
    selected.extend((item, "Anatomy", "علوم التشريح", f"public/assets/mcq-answers/{filename}")
                    for item in pick(items, lambda q: q["id"].startswith("GS-ANAT03-"), min(5 - len(selected), 1), label))

# 5 Pathology items: balanced across the two source-provided GitHub banks.
for filename, count in [("pathology-lecture1-80.json", 3), ("pathology-cell-injury-80.json", 2)]:
    items = load(filename)
    selected.extend((item, "Pathology", "علم الأمراض", f"public/assets/mcq-answers/{filename}")
                    for item in items[:count])

micro = load("microbiology-80.json")
# 5 basic-surgical-science items spanning microbiology and immunology.
for topic, count in [
    ("Specimen collection and transport", 2),
    ("Diagnostic microbiology", 2),
    ("Immunology and serology", 1),
]:
    selected.extend((item, "Microbiology & Immunology", "الأحياء الدقيقة والمناعة", "public/assets/mcq-answers/microbiology-80.json")
                    for item in pick(micro, lambda q, topic=topic: q.get("topic") == topic, count, topic))

# 20 available Principles-of-Surgery items: infection prevention plus antimicrobial stewardship.
used_ids = {item["id"] for item, _, _, _ in selected}
selected.extend((item, "Principles of Surgery", "مبادئ الجراحة", "public/assets/mcq-answers/microbiology-80.json")
                for item in pick(micro, lambda q: q.get("topic") == "Infection prevention and control" and q.get("id") not in used_ids, 16, "infection prevention"))
used_ids = {item["id"] for item, _, _, _ in selected}
selected.extend((item, "Principles of Surgery", "مبادئ الجراحة", "public/assets/mcq-answers/microbiology-80.json")
                for item in pick(micro, lambda q: q.get("topic") == "Antimicrobial resistance and stewardship" and q.get("id") not in used_ids, 4, "antimicrobial stewardship"))

# 5 Pharmacology items from the existing NotebookLM-derived GitHub banks.
selected.extend((item, "Pharmacology", "علم الأدوية", "public/assets/mcq-answers/notebooklm-analgesics.json")
                for item in pick(load("notebooklm-analgesics.json"), lambda q: True, 3, "analgesics"))
selected.extend((item, "Pharmacology", "علم الأدوية", "public/assets/mcq-answers/notebooklm-blood-disorder-drugs.json")
                for item in pick(load("notebooklm-blood-disorder-drugs.json"), lambda q: True, 2, "blood disorder drugs"))

if len(selected) != 40:
    raise SystemExit(f"Expected 40 items, got {len(selected)}")

questions = [normalize(item, index, section, section_ar, source_file)
             for index, (item, section, section_ar, source_file) in enumerate(selected, start=1)]
ids = [q["id"] for q in questions]
if len(set(ids)) != len(ids):
    raise SystemExit("Duplicate question IDs in the midterm bank")

payload = {
    "schemaVersion": "1.0",
    "title": "امتحان النصفي — General Surgery Diploma",
    "language": "en",
    "questionCount": 40,
    "answerVisibility": "hidden-until-submitted",
    "sourcePolicy": "GitHub-only selection from existing question assets; no new questions were authored.",
    "coverageNote": "This 40-question midterm follows the requested allocation: 5 Anatomy, 5 Microbiology & Immunology, 5 Pathology, 5 Pharmacology, and 20 Principles of Surgery. Difficulty labels are normalized from the source-bank labels; they are not a substitute for independent clinical review.",
    "sections": [
        {"id": "anatomy", "label": "Anatomy", "labelAr": "علوم التشريح", "count": 5},
        {"id": "pathology", "label": "Pathology", "labelAr": "علم الأمراض", "count": 5},
        {"id": "microbiology-immunology", "label": "Microbiology & Immunology", "labelAr": "الأحياء الدقيقة والمناعة", "count": 5},
        {"id": "pharmacology", "label": "Pharmacology", "labelAr": "علم الأدوية", "count": 5},
        {"id": "principles-of-surgery", "label": "Principles of Surgery", "labelAr": "مبادئ الجراحة", "count": 20},
    ],
    "questions": questions,
}
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(questions)} questions to {OUTPUT}")
for section in payload["sections"]:
    print(section["label"], section["count"])
