# Microbiology 80-Question Draft Validation Report

- **JSON file:** `microbiology-80-draft.json`
- **Question count:** 80
- **Schema:** 1.0; language `en`; answer visibility `hidden-until-submitted`
- **Validation:** Passed: 80 questions; 80 unique `GS-MICRO-` IDs; four options per question; every `correctOptionIndex` is 0–3; no question has `status: "approved"`.

## Topic distribution

| Topic | Count |
|---|---:|
| Specimen collection and transport | 16 |
| Diagnostic microbiology | 16 |
| Antimicrobial resistance and stewardship | 16 |
| Infection prevention and control | 16 |
| Immunology and serology | 16 |

## Source limits

Content was generated only from the local text files `diagnostic.txt`, `resistance.txt`, and `immunology.txt` in `/tmp/gs_micro_sources`. Clinical references point to the source title and use `reviewStatus: "pending-clinical-review"`; no page numbers were invented, so `page` is null. The source set is lecture-style and does not provide external guideline editions, page citations, or independent clinical validation. All questions remain drafts pending academic/clinical review.
