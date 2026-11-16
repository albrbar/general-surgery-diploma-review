#!/usr/bin/env python3
"""Import the locally verified Telegram MCQs as non-exam pending records.

This script intentionally reads only the checked-in/supplied Telegram export and
never assigns an answer key, difficulty, or learner eligibility.
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PENDING = ROOT / "public/assets/mcq-answers/telegram-pending.json"
BANK = ROOT / "public/assets/mcq-answers/unified-bank.json"


def normalize(text: str) -> str:
    return re.sub(r"\W+", " ", unicodedata.normalize("NFKC", text).lower()).strip()


def main() -> None:
    pending = json.loads(PENDING.read_text(encoding="utf-8"))
    bank = json.loads(BANK.read_text(encoding="utf-8"))
    questions = bank["questions"]
    existing_ids = {q.get("id") for q in questions}
    existing_stems = {normalize(q.get("stem", "")) for q in questions}
    added = 0
    for record in pending["questions"]:
        if record["id"] in existing_ids:
            continue
        if normalize(record["stem"]) in existing_stems:
            raise SystemExit(f"Refusing silent stem collision: {record['id']}")
        questions.append(record)
        existing_ids.add(record["id"])
        existing_stems.add(normalize(record["stem"]))
        added += 1
    bank["totalQuestions"] = len(questions)
    BANK.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"added": added, "totalQuestions": len(questions), "pending": len(pending["questions"])}, ensure_ascii=False))


if __name__ == "__main__":
    main()
