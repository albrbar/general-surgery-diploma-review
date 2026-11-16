# Question Bank Workflow

GSDIPLOMAREVISION uses a source-traceable workflow for future question-bank updates. The live portal is built from reviewed JSON exports; raw Drive material is not loaded directly by the browser.

## Source to publication

1. **Source** — read the lecture or approved educational source without modifying the original.
2. **Draft** — create a lecture-scoped batch with stable IDs, four options, one answer index, an explanation, source metadata, difficulty, and lecture reference.
3. **Validation** — check the schema, answer bounds, empty fields, stable IDs, internal duplicates, and collisions with the existing Day 1–Day 16 and 640-MCQ registries.
4. **Human review** — generated material remains `draft` until the responsible clinical reviewer confirms the stem, distractors, answer, explanation, and source location.
5. **Pull request** — submit one reviewable change per lecture or clearly bounded batch, including the validation report and updated index.
6. **Publication** — only approved data is copied into the public runtime bank and deployed through the existing GitHub Pages workflow.

## Data rules

- Keep the original Drive source read-only.
- Never replace the current application source with an older exported `App.tsx` snapshot.
- Never mark generated questions as clinically approved automatically.
- Preserve stable IDs; do not recycle IDs after removal.
- Keep duplicate source files archived rather than deleting them automatically.
- Keep source links and page/snapshot references with each question where available.
- Do not commit Drive credentials, API keys, student records, or private notebook exports.

## Recommended batch shape

A lecture batch should contain one JSON file with 80 questions when the source supports that volume. The target difficulty mix is approximately 30% easy, 50% medium, and 20% hard. Each generated batch is a draft and must pass validation before review. The public portal should expose only the approved output.

## Current portal boundary

The current repository already contains the published Day 1–Day 16 pathway, the Midterm application, and published question-bank JSON files. This workflow is for controlled future updates; it does not alter the historical Day 1–Day 16 questions or their images.

## Local validation example

```bash
python3 scripts/qbank-pipeline/mcq_batch_validator.py \
  path/to/batch.json --site3 --against path/to/dedup_registry.json
```

Run the repository typecheck/build after integrating an approved batch, then verify the affected static URL and one representative question in the deployed Pages site.
