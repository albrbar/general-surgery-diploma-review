#!/usr/bin/env python3
"""Generate clearly-labelled AI MCQ drafts through Groq's server-side API."""
import argparse
import json
import os
import re
import sys
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


def ask_groq(section: str, count: int) -> dict:
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
        "Use exactly four plausible options and one best answer. Avoid duplicate questions. Return one question at each difficulty: very easy, easy, moderate, hard, and very hard."
    )
    user = (
        f"Generate exactly {count} new MCQs for the General Surgery Diploma section: {section_label}. "
        "Use core surgical-science and basic-surgery teaching appropriate for diploma learners. "
        "Each explanation must briefly justify the best answer and distinguish it from the distractors. Use exactly one question at each of these difficulty levels: very easy, easy, moderate, hard, very hard. "
        "Use this exact JSON shape and no markdown: " + json.dumps(schema_instruction)
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
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            result = json.load(response)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
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
    for index, question in enumerate(questions, 1):
        if not isinstance(question, dict):
            raise RuntimeError(f"Question {index} is not an object")
        options = question.get("options")
        answer = question.get("correctOptionIndex")
        if not question.get("stem") or not isinstance(options, list) or len(options) != 4 or answer not in range(4) or question.get("difficulty") not in {"very easy", "easy", "moderate", "hard", "very hard"}:
            raise RuntimeError(f"Question {index} failed the MCQ shape check")
        question["id"] = f"ai-{section}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{index:02d}"
        question["section"] = section_label
        question["status"] = "ai-generated-draft"
        question["reviewStatus"] = "requires-supervisor-review"
        question["source"] = question.get("source") or f"General Surgery Diploma — {section_label}"
        validated.append(question)
    return {"section": section_label, "sectionId": section, "status": "ai-generated-draft", "model": MODEL, "generatedAt": datetime.now(timezone.utc).isoformat(), "questions": validated}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--section", choices=[*SECTIONS, "all"], required=True)
    parser.add_argument("--count", type=int, default=5)
    parser.add_argument("--output", default="public/ai-mcq/generated")
    args = parser.parse_args()
    if not 1 <= args.count <= 20:
        parser.error("--count must be between 1 and 20")
    sections = list(SECTIONS) if args.section == "all" else [args.section]
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    manifest = {"generatedAt": datetime.now(timezone.utc).isoformat(), "model": MODEL, "groups": []}
    for section in sections:
        result = ask_groq(section, args.count)
        target = output / f"{section}.json"
        target.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        manifest["groups"].append({"section": section, "label": SECTIONS[section], "file": f"generated/{section}.json", "count": len(result["questions"]), "status": result["status"], "model": MODEL, "generatedAt": result["generatedAt"]})
        print(f"Generated {len(result['questions'])} AI draft questions for {SECTIONS[section]}")
    (output.parent / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
