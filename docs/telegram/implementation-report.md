# Telegram Test and Updates — implementation report

**Branch:** `feature/telegram-test-updates`
**Snapshot:** 16 November 2026
**Scope:** only the two authorised Telegram-source exports supplied for this task.

## What changed

- Added an independent `Telegram Test and Updates` route and home-page icon.
- Added a source-snapshot page that keeps the two groups visibly separate.
- Clearly labels the page as a snapshot: live monitoring is not active, automatic updates are not enabled, and no account session, credential, bot, or private Telegram URL is stored in the site.
- Added 58 Group 02 MCQ records to `public/assets/mcq-answers/unified-bank.json` and retained a separate `telegram-pending.json` intake file.
- Preserved `source_group`, `source_message_id`, `source_question_id`, source date/timestamp, source explanations, and missing/duplicate notes.
- Kept `source_answer: null`, `correctOptionIndex: null`, `difficulty: null`, `reviewStatus: pending-clinical-review`, and `eligibleForExam: false` for every imported question.

## Source separation and gaps

- Group 01 (`دبلومة الجراحة العامة`) is used for the separately displayed announcement and lecture-file inventory only. Its midterm announcement is not used to validate Group 02 questions.
- Group 02 (`Diploma GS الدفعة الثالثة 6-2026`) contributes 58 complete records, Q2–Q59. Question 1 was not captured. Question numbers 31 and 37 were documented as duplicates in the source inspection and were retained once each.
- 57 records have source explanations; the explanations are source text and are not answer keys.
- No imported Telegram record is eligible for any learner exam.

## Validation

- `npm run check` — passed.
- `npm run build` — passed.
- `git diff --check` — passed.
- Import script rerun — idempotent (`added: 0` on the second run).
- Bank assertions — passed: 2,486 total records, 58 Telegram pending records, 0 eligible Telegram records.
- Chromium mobile smoke test for `#/telegram` — passed; title, snapshot warning, and 58-question status rendered.

## Release status

This is a review branch only. No merge and no final public release was performed from this task. Independent review is required before any pending Telegram record can be clinically approved or exposed as an exam.
