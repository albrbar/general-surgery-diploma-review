# Day 1–Day 16 integrated site

This directory documents the static Day 1–Day 16 build integrated into the `gsdiplomarevision` GitHub Pages gateway.

- Public route: `/general-surgery-diploma-review/day1-16/`
- Source package: Manus collaborative Cloud folder, `code.zip`
- Build command: `pnpm exec vite build --base=/general-surgery-diploma-review/day1-16/`
- Data: 16 study sections × 80 questions = 1,280 questions, 8 questions/page
- Status: technical preview; medical content remains subject to independent clinical review

## Stable answer/reference screenshots

The two Day 15 visual assets that previously referenced private Manus storage are available at stable public paths:

- `../../public/assets/day15/oncology-mammogram-safe_36df3153.jpg`
- `../../public/assets/day15/wound-healing-photo_ade4ef3c.jpg`

They are cropped from the corresponding source pages and contain no added annotations. The integrated build also includes them under `day1-16/manus-storage/` for the quiz runtime.
