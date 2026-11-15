#!/usr/bin/env python3
"""Generate clearly-labelled AI MCQ drafts through Groq's server-side API."""
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

SECTIONS = {
    "anatomy": "Anatomy",
    "pathology": "Pathology",
    "pharmacology": "Pharmacology",
    "microbiology-immunology": "Microbiology and Immunology",
    "principles-of-surgery": "Principles of Surgery",
}
MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
DIFFICULTIES = ("easy", "moderate", "hard")


def ask_groq(section: str, count: int, target_difficulty: str | None = None, existing_fingerprints: set[str] | None = None, bank_reference: str = "") -> dict:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")
    section_label = SECTIONS[section]
    schema_instruction = {
        "section": section_label,
        "status": "ai-generated-draft",
        "questions": [
            {
                "id": "unique string",
                "stem": "question text",
                "options": ["A", "B", "C", "D"],
                "correctOptionIndex": 0,
                "explanation": "brief educational explanation",
                "source": "topic name or standard principle; do not invent a page number",
                "difficulty": "very easy | easy | moderate | hard | very hard",
            }
        ],
    }
    system = (
        "You create high-quality postgraduate general-surgery revision MCQs. "
        "Return only valid JSON. These are educational AI drafts, not clinically approved advice. "
        "Do not invent citations, page numbers, named guidelines, or patient-specific recommendations. "
        "Use exactly four plausible options and one best answer. Avoid duplicate questions."
    )
    difficulty_instruction = f"The one requested question must have difficulty exactly: {target_difficulty}. " if target_difficulty else ""
    user = (
        f"Generate exactly {count} new MCQs for the General Surgery Diploma section: {section_label}. "
        "Use core surgical-science and basic-surgery teaching appropriate for diploma learners. "
        "Each explanation must briefly justify the best answer and distinguish it from the distractors. "
        + difficulty_instruction
        + "Use this exact JSON shape and no markdown: " + json.dumps(schema_instruction)
    )
    payload = json.dumps({
        "model": MODEL,
        "temperature": 0.35,
        "max_completion_tokens": max(6000, count * 900),
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "reasoning_effort": "low",
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "mcq_draft_set",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "section": {"type": "string"},
                        "status": {"type": "string"},
                        "questions": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string"},
                                    "stem": {"type": "string"},
                                    "options": {"type": "array", "items": {"type": "string"}},
                                    "correctOptionIndex": {"type": "integer", "minimum": 0, "maximum": 3},
                                    "explanation": {"type": "string"},
                                    "source": {"type": "string"},
                                    "difficulty": {"type": "string", "enum": ["very easy", "easy", "moderate", "hard", "very hard"]}
                                },
                                "required": ["id", "stem", "options", "correctOptionIndex", "explanation", "source", "difficulty"],
                                "additionalProperties": False
                            },
                        }
                    },
                    "required": ["section", "status", "questions"],
                    "additionalProperties": False
                }
            }
        },
    }).encode("utf-8")
    request = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "gsdiploma-groq-mcq-generator/1.0",
        },
        method="POST",
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                result = json.load(response)
            break
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            if exc.code == 429 and attempt < 4:
                match = re.search(r"try again in ([0-9.]+)s", body)
                wait_seconds = max(2.0, float(match.group(1)) + 0.5) if match else 3.0
                print(f"Groq rate limit reached; retrying in {wait_seconds:.1f}s", flush=True)
                time.sleep(wait_seconds)
                continue
            raise RuntimeError(f"Groq request failed with HTTP {exc.code}: {body[:600]}") from exc
    content = result["choices"][0]["message"]["content"]
    try:
        generated = json.loads(content)
    except json.JSONDecodeError as exc:
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip(), flags=re.IGNORECASE)
        try:
            generated = json.loads(cleaned)
        except json.JSONDecodeError:
            raise RuntimeError(f"Groq returned invalid JSON: {exc}") from exc
    questions = generated.get("questions")
    if not isinstance(questions, list) or len(questions) != count:
        raise RuntimeError(f"Groq returned {len(questions) if isinstance(questions, list) else 0} questions; expected {count}")
    validated = []
    existing_fingerprints = existing_fingerprints or set()
    for index, question in enumerate(questions, 1):
        if not isinstance(question, dict):
            raise RuntimeError(f"Question {index} is not an object")
        options = question.get("options")
        answer = question.get("correctOptionIndex")
        if (not isinstance(question.get("stem"), str) or len(question["stem"].strip()) < 15
                or not isinstance(options, list) or len(options) != 4 or answer not in range(4)
                or any(not isinstance(option, str) or len(option.strip()) < 1 for option in options)
                or len({re.sub(r"[^a-z0-9]+", "", option.lower()) for option in options}) != 4
                or not isinstance(question.get("explanation"), str) or len(question["explanation"].strip()) < 10
                or not isinstance(question.get("source"), str) or not question["source"].strip()):
            raise RuntimeError(f"Question {index} failed the MCQ quality check: four distinct options, answer index, explanation, stem, and source are required")
        fingerprint = re.sub(r"[^a-z0-9]+", "", str(question["stem"]).lower())
        if fingerprint in existing_fingerprints:
            question["duplicateOfExisting"] = True
        question["options"] = options[:4]
        if target_difficulty:
            question["difficulty"] = target_difficulty
        if question.get("difficulty") not in set(DIFFICULTIES):
            raise RuntimeError(f"Question {index} returned an unsupported difficulty")
        existing_fingerprints.add(fingerprint)
        question["id"] = f"ai-{section}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{index:02d}"
        question["section"] = section_label
        question["status"] = "ai-generated-draft"
        question["reviewStatus"] = "requires-supervisor-review"
        question["source"] = question.get("source") or f"General Surgery Diploma — {section_label}"
        validated.append(question)
    return {"section": section_label, "sectionId": section, "status": "ai-generated-draft", "model": MODEL, "bankReference": bank_reference, "generatedAt": datetime.now(timezone.utc).isoformat(), "questions": validated}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--section", choices=[*SECTIONS, "all"], required=True)
    parser.add_argument("--count", type=int, default=5)
    parser.add_argument("--output", default="public/ai-mcq/generated")
    parser.add_argument("--bank", default="public/assets/mcq-answers/unified-bank.json", help="Unified bank used for duplicate protection")
    args = parser.parse_args()
    if not 1 <= args.count <= 40:
        parser.error("--count must be between 1 and 40")
    sections = list(SECTIONS) if args.section == "all" else [args.section]
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    bank_path = Path(args.bank)
    existing_fingerprints = set()
    bank_count = 0
    if bank_path.exists():
        bank_data = json.loads(bank_path.read_text(encoding="utf-8"))
        bank_questions = bank_data.get("questions", []) if isinstance(bank_data, dict) else bank_data
        bank_count = len(bank_questions)
        existing_fingerprints = {re.sub(r"[^a-z0-9]+", "", str(q.get("stem", "")).lower()) for q in bank_questions if q.get("stem")}
    else:
        print(f"Warning: unified bank not found at {bank_path}; duplicate protection disabled", file=sys.stderr)
    manifest = {"generatedAt": datetime.now(timezone.utc).isoformat(), "model": MODEL, "groups": []}
    for section in sections:
        questions = []
        if args.count == 40:
            difficulty_plan = [("easy", 14), ("moderate", 14), ("hard", 12)]
        elif args.count == 5:
            difficulty_plan = [("easy", 2), ("moderate", 2), ("hard", 1)]
        else:
            difficulty_plan = [(None, args.count)]
        for difficulty, difficulty_count in difficulty_plan:
            single = ask_groq(section, difficulty_count, difficulty, existing_fingerprints, str(bank_path))
            questions.extend(single["questions"])
        generated_at = datetime.now(timezone.utc).isoformat()
        result = {"section": SECTIONS[section], "sectionId": section, "status": "ai-generated-draft", "model": MODEL, "bankReference": str(bank_path), "bankQuestionCount": bank_count, "generatedAt": generated_at, "questions": questions}
        target = output / f"{section}.json"
        target.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        manifest["groups"].append({"section": section, "label": SECTIONS[section], "file": f"generated/{section}.json", "count": len(questions), "status": result["status"], "model": MODEL, "generatedAt": generated_at})
        print(f"Generated {len(questions)} AI draft questions for {SECTIONS[section]}")
    (output.parent / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
