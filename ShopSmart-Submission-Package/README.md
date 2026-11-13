# ShopSmart Submission Package

This folder is organized for the ShopSmart guided quality and deployment hand-in.

## Package contents

- `project-source/` — application source and package manifests. Environment files, Git metadata, installed dependencies, and generated build output are excluded.
- `documentation/` — quality/deployment summary, test record, and evidence index.
- `evidence/screenshots/` — location for the required screenshot image files.
- `deliverables/` — the existing `ShopSmart_Final_Submission.pdf`, included without modification.

## Before submitting

1. Review `documentation/03-Evidence-Index.md`.
2. Save the catalog-match, no-match, and provider-fallback screenshots into `evidence/screenshots/` using the listed filenames. Browser screenshot outputs previously appeared in the chat but were not available as files to copy into this package.
3. The requested branch exists locally, but has not been pushed to GitHub.
4. Create a fresh ZIP after adding screenshots. Do not include `.env` files, API keys, `node_modules`, `.git`, or build output.

## Validation

`npm run check` passed on 2026-11-13: frontend and backend lint passed, frontend tests passed (4/4), backend tests passed (20/20), and the Vite production build succeeded.
