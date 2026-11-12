# Activity 3 – Fix and Verify

**Tester / recorder:** Stephanie Joy Revano (solo project)
**Date:** 2026-11-12
**Branch:** ASC_DEPLOYMENT_SHOPSMART_REVANO

I fixed D5 first because it was required. D1 was small, so I fixed it too. D2 was a one-line cause in the same file, so I fixed it while I was there. D3 and D4 are still open.

| ID | Defect | Status |
|---|---|---|
| D5 | Health endpoint says "ok" while the database is down | **Fixed** |
| D1 | Typing "10" in the cart quantity box saves "1" first | **Fixed** |
| D2 | Zero-quantity message uses the info style | **Fixed** |
| D3 | Checkout errors do not say which field is wrong | Open |
| D4 | Fallback assistant suggests a product matched only by a category word | Open |

---

## D5 – Health check does not check the database

**Reproduction (before the fix)**

| Field | Record |
|---|---|
| Starting state | Backend running. PostgreSQL service stopped in `services.msc`. |
| Action | `curl.exe -i http://localhost:3000/api/health` |
| Actual | `HTTP/1.1 200 OK` with `{"status":"ok"}`. At the same time `GET /api/products` failed with 500. |
| Expected | The health check says the service is not healthy. |
| Evidence | `screenshots/02-6b-health-db-down.png` |

**Root cause.** In `backend/src/app.js`, the health route always sent `{"status":"ok"}`. It never talked to the database.

**Change.**
- `backend/src/app.js`: the health route now runs `SELECT 1` through Prisma.
  - It waits at most 2 seconds, so a stuck database cannot make it hang.
  - Database answers: `200 {"status":"ok","database":"ok"}`.
  - Database fails or is too slow: `503 {"status":"error","database":"unreachable"}`.
  - The response has no error details. The log line only says `[health] database check failed`.
- `createApp()` now takes an optional `checkDatabase` function. The default uses Prisma. Tests can pass a fake one, so they do not need a real database.

**Tests added** (`backend/test/health.test.js`, node:test):
1. Database answers → 200 with `database: "ok"`.
2. Database check throws "Can't reach database server at localhost:5432" → 503, and the response does not contain `localhost` or `5432`.
3. Database check never answers → 503 in under 1 second (test timeout set to 50 ms).

**Repeat test after the fix (live, with the real database).**

| Step | Result | Evidence |
|---|---|---|
| PostgreSQL running | `HTTP/1.1 200 OK`, `{"status":"ok","database":"ok"}`, about 6 ms | `03-health-db-up.txt` |
| PostgreSQL stopped (I stopped it in `services.msc`) | `HTTP/1.1 503 Service Unavailable`, `{"status":"error","database":"unreachable"}`, about 2 s | `03-health-db-down.txt` |
| PostgreSQL started again | `HTTP/1.1 200 OK`, `{"status":"ok","database":"ok"}`. Product 4 still had stock 3 with the same `updatedAt`, so no data was lost. | `03-health-db-recovered.txt` |

**Decision: Pass. D5 is fixed.**

---

## D1 – Typing "10" in the cart quantity box saves "1" first

**Reproduction (before the fix)**

| Field | Record |
|---|---|
| Starting state | Cart has Wireless Mouse × 4 (stock 4) and Laptop Stand × 1. Total ₱3,800. |
| Action | Select the Mouse quantity box and type `10`. |
| Actual | After `1`, the quantity became 1. After `0`, 10 was refused. The cart was left at Mouse × 1, total ₱1,850. |
| Expected | 10 is refused and the quantity stays at 4. |
| Evidence | `screenshots/02-2-cart-step5.png` |

**Root cause.** In `frontend/src/pages/CartPage.jsx`, the box called `setQuantity` on every key press. So "1" was saved before the customer could type "0".

**Change.**
- `frontend/src/pages/CartPage.jsx`: a small `QuantityInput` component keeps what the customer types as a draft. The cart only changes on blur or Enter. Escape puts the old value back. If the value is refused, the box shows the old quantity again. The + and − buttons are not changed.
- `frontend/src/utils/cart.js`: new helper `parseQuantityDraft()`. It turns the typed text into a number. Blank text becomes `NaN`, so the existing `updateCartQuantity()` refuses it like any other bad value.

**Tests added** (`frontend/src/utils/cart.test.js`, vitest, no new packages):
1. `parseQuantityDraft` reads "10" as 10, " 3 " as 3, and blank as NaN.
2. "10" with stock 4 is refused with "Only 4 unit(s) are available." The cart is not changed and the total stays 3,800.
3. Blank, "0", "1.5" and "abc" are refused and the cart is not changed.
4. A valid "2" is applied and the total becomes 2,500.

These tests cover the logic. The React event wiring (blur and Enter) cannot be unit tested without new packages, so I also tested it in a real browser.

**Repeat test after the fix (real browser).** I drove Microsoft Edge (headless, new empty profile) with a short local script. It pressed the keys one at a time, like a person typing. Only the cart was used, and no order was placed. The full record is in `03-d1-browser-check.txt`.

| Step | Box | Items / total | Message |
|---|---|---|---|
| Start: Mouse × 3 (stock 3) + Laptop Stand × 1 | 3 | 4 / ₱3,150 | none |
| Type `1` | 1 | 4 / ₱3,150 | none (cart not changed) |
| Type `0` | 10 | 4 / ₱3,150 | none (cart not changed) |
| Press Enter | 3 | 4 / ₱3,150 | "Only 3 unit(s) are available." (red) |
| Type `2`, press Enter | 2 | 3 / ₱2,500 | none |
| Click + then − | 3, then 2 | 4 / ₱3,150, then 3 / ₱2,500 | none |

Note: Mouse stock was 3 here, not 4, because order #9 in Activity 2 used one.

**Decision: Pass. D1 is fixed.**

---

## D2 – Zero-quantity message uses the info style

**Reproduction (before the fix).** Type `0` in the Mouse box. The quantity stayed the same, but "Quantity must be a whole number greater than zero." was shown in teal (info), not red. Evidence: `screenshots/02-2-cart-step6.png`.

**Root cause.** `CartPage.jsx` chose the red style only when the message started with "Only".

**Change.** `frontend/src/context/CartContext.jsx` now keeps a `cartMessageType` (`error` or `info`) next to the message. `CartPage.jsx` uses that type.

**Repeat test after the fix (real browser).** Typed `0` and pressed Tab. The quantity stayed 3, and the message was shown in the red error style. Evidence: `03-d1-browser-check.txt`.

**Decision: Pass. D2 is fixed.**

---

## Check result after the fixes

`npm run check` from the repo root: **exit code 0**. Full output: `03-check-after-fix.txt`.

| Step | Result |
|---|---|
| Lint (frontend and backend) | Clean |
| Frontend tests | 15/15 passed (11 before + 4 new) |
| Backend tests | 61/61 passed (58 before + 3 new) |
| Frontend build | OK |

No existing test was removed or changed.

---

## Defects still open

| ID | Impact | Safe temporary limitation |
|---|---|---|
| D3 – checkout errors do not name the field | Low. The customer sees "Check the customer and cart information." but not which field is wrong. | The server still refuses bad input and no order is made. The form keeps the typed values. The release note tells testers to check the email and the address (at least 10 real characters). |
| D4 – fallback assistant suggests a product matched only by a category word | Low. When the AI is down, "I need a study lamp" suggests the Laptop Stand. | The out-of-stock lamp is never recommended. Every suggestion is a real product with its real price and a source link. The fallback note says the AI was not used. Listed in the release note. |

Other known risks from the baseline (not defects found in Activity 2, so not fixed here): no login or roles, no rate limit on `POST /api/orders`, a possible duplicate order if the browser times out during checkout, the seed script wipes data, and the npm audit findings. They are listed in the deployment plan and the release note.
