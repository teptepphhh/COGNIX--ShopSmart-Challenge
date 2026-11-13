# ShopSmart Test Record

## Automated checks

| Check | Result | Evidence |
|---|---|---|
| Frontend lint | PASS | `npm run check` |
| Backend lint | PASS | `npm run check` |
| Frontend tests | PASS — 4 tests | `npm run check` |
| Backend tests | PASS — 20 tests | `npm run check` |
| Production build | PASS | Vite build completed |

## Assistant scenarios

| Scenario | Expected behavior | Observed result |
|---|---|---|
| Catalog match: “Which keyboard is below ₱2,000?” | Recommend an in-stock catalog item within budget with a valid source | PASS — Compact Mechanical Keyboard, ID 8, ₱1,850 |
| No match: “Do you sell refrigerators?” | No recommendation or source is invented | PASS — `answerMode: "no_match"` with empty recommendation/source arrays |
| Invalid input: “hi” | Reject question shorter than three characters | PASS — HTTP 422, `INVALID_QUESTION` |
| Provider unavailable | Show a verified catalog fallback | PASS — fallback notice and catalog-grounded keyboard recommendation |

## Browser purchase journey

The browser journey was observed: add a product, verify cart quantity and total, proceed to checkout, submit simulated delivery details, and verify the success page and empty cart. No personal details from the test form are recorded here.

## Evidence limitations

Screenshots were displayed as browser-tool outputs during the session, but were not saved as local image files. The package therefore does not claim that screenshot files are already included. See `03-Evidence-Index.md` for the required filenames and capture checklist.
