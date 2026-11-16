#!/usr/bin/env python3
"""Build the 40-question midterm from the existing unified bank only."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UNIFIED = ROOT / "public/assets/mcq-answers/unified-bank.json"
OUTPUT = ROOT / "public/midterm/questions.json"
BANK = json.loads(UNIFIED.read_text(encoding="utf-8"))["questions"]


def section_items(name):
    aliases = {"Microbiology & Immunology": {"Microbiology & Immunology", "Microbiology and Immunology"}}
    allowed = aliases.get(name, {name})
    return [q for q in BANK if q.get("section") in allowed]


def pick(items, predicate, count, label, used):
    found = [q for q in items if q["id"] not in used and predicate(q)]
    if len(found) < count:
        raise SystemExit(f"{label}: requested {count}, found {len(found)}")
    chosen = found[:count]
    used.update(q["id"] for q in chosen)
    return chosen


def normalize(item, number, section, section_ar):
    idx = item.get("correctOptionIndex", item.get("answer_index"))
    if not isinstance(idx, int) or idx not in range(4):
        raise SystemExit(f"{item.get('id')}: invalid answer index")
    raw = str(item.get("difficulty", "moderate")).lower().strip()
    difficulty = {"medium": "moderate", "very easy": "easy", "very hard": "hard"}.get(raw, raw)
    if difficulty not in {"easy", "moderate", "hard"}:
        difficulty = "moderate"
    return {
        "number": number, "id": item["id"], "section": section, "sectionAr": section_ar,
        "topic": item.get("topic", "General"), "stem": item["stem"], "options": item["options"],
        "correctOptionIndex": idx, "difficulty": difficulty, "explanation": item.get("explanation", ""),
        "status": item.get("status", "approved"), "clinicalReference": item.get("clinicalReference", {}),
        "source": item.get("source") or item.get("origin_file"), "sourceFile": item.get("sourceFile") or item.get("origin_file", "unified-bank.json"),
        "tags": item.get("tags", []),
    }

used = set()
selected = []

def add(section, section_ar, items):
    selected.extend((q, section, section_ar) for q in items)

# Basic surgical sciences: one item from five distinct Anatomy lecture sources.
an = section_items("Anatomy")
an_topics = ["ABD", "BRST", "Upper Limb: Nerves, Vessels & Lymphatics", "Lower Limb: Nerves, Vessels & Lymphatics", "The Pelvis & Perineum"]
for topic in an_topics:
    add("Anatomy", "علوم التشريح", pick(an, lambda q, t=topic: q.get("topic") == t, 1, f"Anatomy: {topic}", used))

# Five Microbiology/Immunology items across diagnostic and immune lectures.
mi = section_items("Microbiology & Immunology")
for topic in ["Specimen collection and transport", "Diagnostic microbiology", "Antimicrobial resistance and stewardship", "Immunology and serology", "Microbiology"]:
    candidates = pick(mi, lambda q, t=topic: t.lower() in str(q.get("topic", "")).lower(), 1, f"Microbiology: {topic}", used)
    add("Microbiology & Immunology", "الأحياء الدقيقة والمناعة", candidates)

# Five Pathology items from distinct lecture themes.
pa = section_items("Pathology")
for term in ["Core Principles", "Causes, Mechanisms", "Inflammation", "Patterns of Necrosis", "Apoptosis"]:
    candidates = pick(pa, lambda q, t=term: t.lower() in str(q.get("topic", "")).lower(), 1, f"Pathology: {term}", used)
    add("Pathology", "علم الأمراض", candidates)

# Five Pharmacology items from the available pharmacology lectures and topics.
ph = section_items("Pharmacology")
for term in ["Analgesics for surgery", "Blood Disorder Drugs", "Antiemetic", "Acid-base", "VTE"]:
    candidates = pick(ph, lambda q, t=term: t.lower() in str(q.get("topic", "")).lower(), 1, f"Pharmacology: {term}", used)
    add("Pharmacology", "علم الأدوية", candidates)

# Principles of Surgery: one question from each requested lecture topic when represented.
ps = section_items("Principles of Surgery")
principles = [
    ("fluids", "Fluids & electrolytes"), ("shock", "Shock"), ("hemorrhage", "Hemorrhage"),
    ("blood and blood products", "Blood and blood products"), ("wound healing", "Wound healing"),
    ("steril", "Sterilisation and disinfection"), ("medical ethics", "Medical ethics"),
    ("consent", "Consent"), ("breaking bad news", "Breaking bad news"),
    ("metabolic response", "Metabolic response to surgery and trauma"), ("nutritional support", "Nutritional support"),
    ("surgical oncology", "Surgical oncology"), ("surgical infections", "Surgical infections I/II"),
    ("septic shock", "Septic shock"), ("venous thromboembolism", "Venous thromboembolism"),
    ("acid-base", "Acid-base disturbances"), ("damage control", "Damage control surgery"),
    ("basic surgical principles", "Basic surgical principles"), ("blood physiology", "Blood physiology"),
    ("surgical site", "Surgical site infection"),
]
for term, label in principles:
    candidates = pick(ps, lambda q, t=term: t.lower() in (str(q.get("topic", "")) + " " + str(q.get("stem", ""))).lower(), 1, f"Principles: {label}", used)
    add("Principles of Surgery", "مبادئ الجراحة", candidates)

if len(selected) != 40:
    raise SystemExit(f"Expected 40 questions, got {len(selected)}")
questions = [normalize(q, i, sec, sec_ar) for i, (q, sec, sec_ar) in enumerate(selected, 1)]
payload = {
    "schemaVersion": "1.1", "title": "Midterm Examination — General Surgery Diploma", "language": "en",
    "questionCount": 40, "answerVisibility": "hidden-until-submitted",
    "sourcePolicy": "Existing unified GitHub question bank only; no new questions were authored.",
    "coverageNote": "Exactly 5 Anatomy, 5 Microbiology & Immunology, 5 Pathology, 5 Pharmacology, and 20 Principles of Surgery. The Principles questions span the requested lecture topics where represented in the unified bank.",
    "sections": [
        {"id": "anatomy", "label": "Anatomy", "labelAr": "علوم التشريح", "count": 5},
        {"id": "pathology", "label": "Pathology", "labelAr": "علم الأمراض", "count": 5},
        {"id": "microbiology-immunology", "label": "Microbiology & Immunology", "labelAr": "الأحياء الدقيقة والمناعة", "count": 5},
        {"id": "pharmacology", "label": "Pharmacology", "labelAr": "علم الأدوية", "count": 5},
        {"id": "principles-of-surgery", "label": "Principles of Surgery", "labelAr": "مبادئ الجراحة", "count": 20},
    ], "questions": questions,
}
OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(questions)} questions to {OUTPUT}")
for s in payload["sections"]: print(s["label"], s["count"])
