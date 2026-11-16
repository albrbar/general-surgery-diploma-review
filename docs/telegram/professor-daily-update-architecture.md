# Telegram → GSDIPLOMA Professor: daily update architecture

## Current state

The site now has a fifth, separate **Telegram Test and Updates** icon and a source-snapshot page. The page is deliberately not connected to Telegram, has no live monitor, and is not scheduled. The 58 imported Group 02 records remain `pending-clinical-review` and are excluded from learner exams.

## Target daily flow

A future authorised integration can run once per day through a server-side worker or a GitHub Actions workflow. The worker should read only new messages from the two explicitly authorised groups, store a cursor per group, and preserve the group title, source message identifier, source date, and captured text. The two streams must remain separate; Group 01 announcements must never be treated as evidence that Group 02 MCQs are an official exam.

The worker can then send a bounded, source-labelled change set to **GSDIPLOMA Professor**. Professor should return an Arabic daily digest for the supervisor, identify new files/questions/gaps/duplicates, and recommend review actions. It must not invent answer keys, convert poll popularity into an answer, assign clinical approval, or publish a learner exam.

The final stage is a review queue. New question records enter the existing unified-bank workflow with `pending-clinical-review`, `source_answer: null`, `correctOptionIndex: null`, and `eligibleForExam: false`. Only an authorised clinical reviewer can add an answer key and approval. The website can expose the count and status, but it must not expose private group links or account credentials.

## Required prerequisites before activation

1. The supervisor explicitly authorises a Telegram account-based reader or another verified Telegram integration for the two groups. A normal bot cannot read a group where it has not been added and granted the required access.
2. Credentials and session material stay in a server-side secret store. They must never enter React source, `public/`, GitHub Pages, logs, the question bank, or Professor prompts.
3. A durable cursor and deduplication store are configured. The job must be idempotent and bounded so a retry cannot duplicate questions or repeatedly call Professor for the same messages.
4. The destination for the daily digest is selected. The safe default is a supervisor-only report or review queue, not an automatic learner-facing update.
5. The supervisor explicitly approves the schedule and any external service cost before enabling it.

## Recommended implementation boundary

GitHub Pages remains a static learner site. The Telegram reader and Professor bridge should run outside the browser, using a protected server-side worker. The worker publishes only sanitized, reviewed JSON or a review report to the repository. A scheduled job is appropriate for a daily unconditional update; an event trigger is appropriate only if a verified Telegram event connector becomes available. Until the source authorization and connector are confirmed, no trigger should be created.

## Safety gates

The pipeline should fail closed when a source cursor is missing, the group identity is not one of the two allow-listed groups, the source message identifier is absent, the Professor response lacks provenance, or a proposed record has a non-null answer without a reviewer identity. Every run should report `captured`, `classified`, `pending_review`, `duplicates`, `gaps`, and `published_review_digest` separately.
