> **Superseded (2026-11-20):** this is the earlier *local* release candidate. The hosted AWS release is described in `RELEASE_NOTE_AWS.md`.

# ShopSmart Release Note

## Version and date

| Field | Value |
|---|---|
| Version | ShopSmart local release candidate 1 (RC1) |
| Date | 2026-11-12 |
| Branch | `ASC_DEPLOYMENT_SHOPSMART_REVANO` |
| Commit tested | `f590296` (last code and check commit). This note and the PDF are added in the next commit. |
| Prepared by | Stephanie Joy Revano (solo) |

## Working features (customer journeys I verified)

| Journey | How it was checked | Evidence |
|---|---|---|
| Browse products and search by name or description | Activity 2 Case 1 (search with results, no results, category + search) | `02-test-record.md` Case 1 |
| Cart: add, change quantity, remove, totals | Activity 2 Case 2, and again in a real browser after the D1 fix | `02-test-record.md` Case 2, `03-d1-browser-check.txt` |
| Simulated checkout with server-side validation and server prices | Activity 2 Case 3 (bad email, blank address, valid order #9), smoke test order #11 | `02-test-record.md` Case 3, `05-smoke-test.txt` |
| Stock rule (out-of-stock blocked in the browser and on the server, two-tab test) | Activity 2 Case 4 | `02-test-record.md` Case 4 |
| Product assistant with sources, no-match answer and fallback | Activity 2 Case 5 (fallback), smoke test (live Gemini answer) | `02-test-record.md` Case 5, `05-smoke-test.txt` |
| Failure handling (API down, database down, AI down) | Activity 2 Case 6 | `02-test-record.md` Case 6 |
| Health check that reports the database state | Activity 3 D5 repeat test (database up, stopped, started again) | `03-health-db-*.txt` |

Final `npm run check`: exit code 0. Lint clean, frontend tests 15/15, backend tests 61/61, build OK (`05-final-check.txt`).

## Fixed in this release

- **D5:** `/api/health` now checks the database. It returns 503 `{"status":"error","database":"unreachable"}` when the database is down.
- **D1:** typing "10" in the cart quantity box no longer saves "1" first. The value is applied on blur or Enter.
- **D2:** cart validation messages now use the red error style.

## Known limitations

- **No login and no roles.** Every route is public. Anyone with the address can place a simulated order.
- **The cart is not saved.** It lives in the browser's memory, so a page refresh empties it.
- **The AI provider was unstable during testing.** Gemini returned 503 and timed out in Activity 2, so the catalog-based fallback was often used. In the final smoke test Gemini answered normally. The fallback always shows a note.
- **Open defects:**
  - **D3:** checkout errors do not say which field is wrong. If you see "Check the customer and cart information.", check that the email is valid and the address has at least 10 real characters.
  - **D4:** when the AI is down, the fallback can suggest a product that only matches by a category word (for example the Laptop Stand for "study lamp"). It never suggests an out-of-stock product.
- **npm audit** reports 17 vulnerabilities (5 critical, 8 high, 4 moderate) in dependencies. They were there before this challenge. Package upgrades were out of scope, so they are not fixed.
- **No rate limit on orders,** and a checkout that times out in the browser could create a duplicate order if retried.
- **Hosting is not done.** See the deployment status below.

## Local startup steps

The full step-by-step guide is in `README.md`. Short version, in order (PowerShell, from the project root unless noted):

1. Install Node.js 22 and PostgreSQL. Start the PostgreSQL service.
2. `Copy-Item backend\.env.example backend\.env` and `Copy-Item frontend\.env.example frontend\.env`. Put your own database URL and, if you have one, a Gemini key in `backend/.env`. Never commit `.env`.
3. `npm install`
4. `cd backend`, then `npx prisma generate`. **Prisma commands must be run from `backend/`**, because that is where `.env` is.
5. Still in `backend/`: for a new, empty database run `npx prisma migrate deploy`. For an existing database, `npx prisma migrate status` should say "Database schema is up to date!".
6. Sample products: only on a brand-new, empty database, run `npm run db:seed` once. **Never run `db:seed` on a database with data you want to keep.** It deletes all orders and resets all products.
7. `cd ..` back to the root, then `npm run check` (lint, tests, build).
8. `npm run dev`, then open http://localhost:5173. The API health check is http://localhost:3000/api/health.

## Deployment status

**Local release candidate only. Live staging was not done because hosting has not been approved yet.**
The deployment plan is ready in `04-deployment-plan.md`, with a diagram in `04-deployment-diagram.svg`.

## Team record (solo)

| Item | Record |
|---|---|
| Team | Stephanie Joy Revano (solo) |
| One test I ran | Activity 3 D5 repeat test. I stopped the PostgreSQL service and called `/api/health`. Before the fix it said 200 "ok". After the fix it returned 503 "unreachable" in about 2 seconds. After I started PostgreSQL again it returned 200, and product 4 still had stock 3. |
| One contribution | I fixed D5 (database-aware health check, with 3 node:test tests), D1 (cart quantity draft, applied on blur or Enter) and D2 (error style), and I verified all three. |
| One issue I can explain | D1. The quantity box called `setQuantity` on every key press. When I typed "10", the "1" was saved first and the cart dropped from 4 mice to 1, even though the screen only showed the "Only 4 unit(s)" error. The fix keeps a draft of the typed text and only updates the cart when I leave the box or press Enter. |
