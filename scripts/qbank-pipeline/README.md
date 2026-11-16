# Question-bank pipeline tools

These utilities are copied from the reviewed Z.ai engineering bundle. They are offline/content-pipeline tools, not browser runtime code.

- `mcq_batch_validator.py`: validates question shape and duplicate constraints.
- `gen_batch_anat.py`: assembles lecture-scoped Anatomy draft batches.
- `bank_index_builder.py`: builds a bank index and checks snapshot references.
- `build_dedup_registry.py`: builds a normalized duplicate registry from exports.
- `render_lecture_snaps.py`: renders source lecture pages for traceable snapshots.

The tools must run without credentials in the repository. Drive access, notebook execution, and publication remain outside the browser bundle. Generated questions remain drafts until clinical review.
