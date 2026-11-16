# Daily Go Test questions in the unified bank

The published Daily Go Test Day 1–16 question snapshot was imported into `public/assets/mcq-answers/unified-bank.json` without rewriting the question stems, options, answer indexes, explanations, or source links.

## Import result

- Input: 16 days × 80 questions = 1,280 legacy questions.
- New unique questions added: 867.
- Existing duplicate stems collapsed: 413.
- Unified bank after import: 2,428 records.
- All imported records have `day`, `section`, `topic`, `sourceFile`, `sourceUrl` (when supplied by the legacy record), `origin: legacy-day-app`, and `eligibleForExam: true`.
- Existing supervisor-approved bank policy was retained; no record was marked pending.

## Classification

The old Daily Go Test records did not contain an explicit difficulty field. The import therefore uses the bank's documented deterministic heuristic and records it explicitly as `difficultyMethod: deterministic-legacy-import-heuristic` and `sourceDifficulty: legacy-unlabelled`. Day, section, topic, source, and legacy question ID remain traceable.

The source snapshot is retained at `public/assets/mcq-answers/legacy-days-1-16.json`, and the repeatable importer is `scripts/qbank-pipeline/import_legacy_day_questions.py`.

## Re-running

From the repository root:

```bash
python3 scripts/qbank-pipeline/import_legacy_day_questions.py
```

This importer is additive and deduplicates by normalized stem and generated legacy ID. It does not generate new medical content.
