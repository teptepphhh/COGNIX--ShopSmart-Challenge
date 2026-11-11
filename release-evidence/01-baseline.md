# Activity 1 – Baseline

**Date:** 2026-11-11
**Tester / recorder:** Stephanie Joy Revano (solo project)
**Branch:** ASC_DEPLOYMENT_SHOPSMART_REVANO (created from ASC_AI_ASSISTANT_SHOPSMART_REVANO at commit 229f4b0)
**Commit:** 229f4b0
**Local URLs:** Frontend http://localhost:5173 | API http://localhost:3000
**Environment:** Windows, Node v22.20.0, npm 10.9.3, Prisma 6.19.3, PostgreSQL on localhost:5432
**Supporting evidence:** `release-evidence/baseline-report.md` (full technical baseline)

## Baseline check
| Step | Result |
|---|---|
| PostgreSQL / migrations | `npx prisma migrate status` (run from `backend/`): "Database schema is up to date!" – 1 migration found, database `shopsmart` at `localhost:5432` |
| `npm run check` | PASS (exit code 0) |
| Lint (frontend, backend) | Clean, no errors or warnings |
| Frontend tests | 11/11 passed |
| Backend tests | 58/58 passed |
| Frontend build (Vite) | OK |
| Home page (`npm run dev`) | Loaded, 6 product cards displayed – see `screenshots/01-home.png` |
| `GET /api/health` | `200 OK`, `{"status":"ok"}` – see `screenshots/01-health.png` |

Note: the handout calls the Express workspace "server"; in this project it is `backend/`.

## API verification
`curl.exe -i http://localhost:3000/api/health` → `HTTP/1.1 200 OK`, body `{"status":"ok"}`

Response headers confirm CORS allows only the frontend origin (`Access-Control-Allow-Origin: http://localhost:5173`)
and Helmet security headers are active (CSP, HSTS, X-Frame-Options, nosniff).

## Catalog snapshot at baseline (`GET /api/products`, 2026-11-11 13:00)
| ID | Product | Price (₱) | Stock |
|---|---|---|---|
| 1 | Wireless Mouse | 650 | 4 |
| 2 | Compact Mechanical Keyboard | 1,850 | 7 |
| 3 | USB-C Study Lamp | 900 | **0** |
| 4 | 1080p Webcam | 1,450 | 4 |
| 5 | Laptop Stand | 1,200 | 7 |
| 6 | USB Headset | 1,350 | 6 |

Stock levels are lower than the seed values, which shows that orders from earlier labs exist
and the database has not been reseeded. This data must be preserved; `npm run db:seed` will not be run.
Product 3 (stock 0) will be used for the stock test in Activity 2.
The home page matches the API: USB-C Study Lamp shows "Out of stock" and its "Add to cart" button is disabled.

## Feature inventory
| Feature | Status | Notes |
|---|---|---|
| Product browsing | Present | Product list and product details pages |
| Search | Present | Server-side search on name or description |
| Cart | Present | Kept in React state only; the cart is lost on page refresh (design limitation) |
| Simulated checkout | Present | `POST /api/orders`, no real payment |
| Stock rule | Present (server side) | Enforced in `orders.js` with a transaction; no automated test for the server rule |
| Product assistant | Present | Grounded on in-stock catalog products, with sources |
| Live AI | **Present** (Google Gemini) | Key stored server-side in `backend/.env`; rule-based fallback on failure |
| Health endpoint | Present | Does not check the database connection |
| Authentication | **Absent** | All routes are public |
| Roles | **Absent** | No admin functions |

Because authentication is absent, the sign-in/role test cases in Activity 2 are not applicable.
This will be recorded as a known limitation in the release note.

## Observations and risks at baseline (not yet fixed)
1. `npm run db:seed` deletes all orders and products (`seed.js:15-17`). It must not be run against data we need to keep.
2. `npm audit` reports 17 vulnerabilities (5 critical, 8 high, 4 moderate), present before this challenge.
3. `POST /api/orders` has no login and no rate limit.
4. A checkout that times out in the browser may still create an order on the server; a retry could create a duplicate.
5. The health check does not test the database.
6. CORS falls back to `http://localhost:5173` when `FRONTEND_URL` is not set.
7. The rate limiter does not set "trust proxy", which may cause problems behind a hosting proxy.
8. Prisma CLI commands must be run from `backend/` (where `.env` is located). Running from the root gives error P1012 "Environment variable not found: DATABASE_URL".
9. Prisma CLI warns that `package.json#prisma` config is deprecated in Prisma 7. No impact on Prisma 6.19.3; the upgrade is out of scope and deferred.
10. A malformed JSON request body returns HTTP 400 with code `INTERNAL_ERROR` and the raw parser message (`app.js` error handler).
11. The cart copies `stock` when an item is added and never refreshes it; the server correctly rejects over-stock orders with 409 at checkout.
12. README "Common problems" advises running `npm run db:seed` when products do not appear, which would erase all orders.