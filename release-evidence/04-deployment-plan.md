# Activity 4 – Deployment Plan

**Prepared by:** Stephanie Joy Revano (solo project)
**Date:** 2026-11-12
**Branch:** ASC_DEPLOYMENT_SHOPSMART_REVANO

**Status: plan only.** The instructor has not approved a hosting platform yet, so nothing is deployed. I kept this plan platform-neutral. I say "a static hosting service", "a Node.js hosting service" and "a managed PostgreSQL service". Steps that depend on the platform are marked **(to be confirmed with the approved platform)**.

## 1. Diagram

Picture version: [04-deployment-diagram.svg](04-deployment-diagram.svg)

```
                       (1) HTTPS, internet
  Browser  ─────────────────────────────────►  Static hosting service
 (tester)                                       Vite build (frontend/dist)
     │                                          config: VITE_API_URL (public, build time)
     │
     │ (2) HTTPS, internet
     │     fetch to VITE_API_URL, CORS allows FRONTEND_URL
     ▼
  Node.js hosting service: Express API ──(4) HTTPS, internet──►  Google Gemini API
     secrets: DATABASE_URL, GEMINI_API_KEY
     config:  FRONTEND_URL, NODE_ENV, PORT, GEMINI_MODEL, GEMINI_TIMEOUT_MS
     health:  https://<api-host>/api/health
     │
     │ (3) TLS, private link if the platform has one
     ▼
  Managed PostgreSQL service (database "shopsmart")
     schema created with: npx prisma migrate deploy
```

Which links cross the internet:
- **(1) Browser to the static host** and **(2) browser to the API**: public internet, HTTPS only.
- **(4) API to Gemini**: public internet, HTTPS. Only the server makes this call. The browser never talks to Gemini.
- **(3) API to PostgreSQL**: should be a private network if the platform has one. If not, it crosses the internet and must use TLS (for example `sslmode=require` in the connection string). **(to be confirmed with the approved platform)**

## 2. Answers to the seven questions

**1. Where is the Vite build hosted, and which API URL does it use?**
The frontend is built with `npm run build --workspace frontend`, which makes `frontend/dist`. That folder goes to a static hosting service. The API address comes from `VITE_API_URL`, for example `https://<api-host>/api`. Vite puts this value into the JavaScript **at build time**. So it is public (anyone can read it in the browser), and if the API address changes, the frontend must be built again. It must be an `https://` address, or the browser will block the calls. The static host must send every path (like `/products/2` or `/cart`) to `index.html`, because the app uses client-side routes. **(to be confirmed with the approved platform)**

**2. Where does Express run, and what is the public health URL?**
The Express API (`backend/`) runs on a Node.js hosting service with Node 22 (see `.nvmrc`). It starts with `npm start --workspace backend` (`node src/server.js`) and listens on the `PORT` the platform gives it. The public health URL will be `https://<api-host>/api/health`. After my D5 fix it really checks the database: 200 `{"status":"ok","database":"ok"}` when healthy, and 503 `{"status":"error","database":"unreachable"}` when the database is down. The platform's health check should point to this path. **(to be confirmed with the approved platform)**

**3. Where does PostgreSQL run, and how is DATABASE_URL given?**
PostgreSQL runs on a managed PostgreSQL service, in its own database for staging, not my local database. The service gives a connection string. I store it as a **secret** environment variable called `DATABASE_URL` in the Node.js hosting service's settings. It is never written in the repo, in a document or in the frontend. Example shape only: `postgresql://<user>:****@<db-host>:5432/shopsmart?schema=public`.

**4. Which origin does FRONTEND_URL allow (CORS)?**
`FRONTEND_URL` is set to the exact address of the static site, for example `https://<frontend-host>`, with no trailing slash and no path. CORS in `backend/src/app.js` then allows only that one origin. If `FRONTEND_URL` is missing, the code falls back to `http://localhost:5173` and the real site would be blocked, so this variable is required in staging.

**5. Where is GEMINI_API_KEY stored, and how does it stay out of the bundle and the repo?**
It is a **secret** environment variable in the Node.js hosting service only. Only `backend/src/services/gemini.js` reads it, on the server. It does not start with `VITE_`, so Vite never puts it into the frontend build. `.env` files are in `.gitignore`, and only the `.env.example` files (with empty values) are in git. Before release I search `frontend/dist` for the Gemini key prefix (see `05-secrets-check.txt`). If the key is missing or Gemini fails, the assistant still works with its catalog-based fallback.

**6. How are migrations run?**
Before the first use, and after each new migration, I run this from `backend/`, with `DATABASE_URL` pointing at the staging database:

```
npx prisma generate
npx prisma migrate deploy
```

This is Prisma 6. `migrate deploy` only applies the migration files in `backend/prisma/migrations`. It never resets data. I will **not** run `npm run db:seed` (it deletes all orders and products), `prisma migrate dev`, `prisma migrate reset` or `prisma db push` on any database with real work in it. If staging needs sample products, I will add them once to the empty database and write that down. **(how to run a one-off command is to be confirmed with the approved platform)**

**7. Who can access staging, and what data is used?**
Staging is private. Only the instructor (and me) should get the link. There is no login in this app, so the link itself must not be shared publicly. If the platform supports a password or access list, I will turn it on. **(to be confirmed with the approved platform)** Only fictional data is used, for example "Juan Dela Cruz, juan.delacruz@example.com, 123 Mabini Street, Barangay Uno, Sample City". No real names, emails, addresses or payments. The checkout is simulated.

## 3. Environment variables per service

| Service | Name | Public or secret | Example placeholder value | Notes |
|---|---|---|---|---|
| Static hosting (build time) | `VITE_API_URL` | Public | `https://<api-host>/api` | Built into the JavaScript. Rebuild if it changes. |
| Node.js hosting (API) | `DATABASE_URL` | **Secret** | `postgresql://<user>:****@<db-host>:5432/shopsmart?schema=public` | From the managed PostgreSQL service |
| Node.js hosting (API) | `GEMINI_API_KEY` | **Secret** | `****` | From Google AI Studio. Server only. |
| Node.js hosting (API) | `FRONTEND_URL` | Public | `https://<frontend-host>` | Exact CORS origin |
| Node.js hosting (API) | `NODE_ENV` | Public | `production` | Set for staging. The code does not read it yet. |
| Node.js hosting (API) | `PORT` | Public | set by the platform (local default 3000) | Do not hard-code it |
| Node.js hosting (API) | `GEMINI_MODEL` | Public | `gemini-3.5-flash-lite` (optional) | Default is used if empty |
| Node.js hosting (API) | `GEMINI_TIMEOUT_MS` | Public | `8000` (optional) | Default is used if empty |
| Managed PostgreSQL | admin user and password | **Secret** | `****` | Kept by the database service. Only the `DATABASE_URL` is copied to the API. |

## 4. Order of steps (when a platform is approved)

1. Create the managed PostgreSQL database. Copy its connection string into the API's secrets as `DATABASE_URL`.
2. Create the Node.js service from this repo. Set the build to `npm ci` and `npx prisma generate` (in `backend/`), and the start to `npm start --workspace backend`. Add all API variables from the table.
3. Run `npx prisma migrate deploy` from `backend/` once against the staging database.
4. Open `https://<api-host>/api/health` and check for `{"status":"ok","database":"ok"}`.
5. Build the frontend with `VITE_API_URL=https://<api-host>/api` and upload `frontend/dist` to the static host. Turn on the "rewrite to index.html" rule.
6. Set `FRONTEND_URL` on the API to the static site's address and restart the API.
7. Smoke test with fictional data only: products, search, cart, one checkout, one assistant question.

## 5. Known deployment risks and what to do

| Risk (from the baseline report) | Where | What to do |
|---|---|---|
| The rate limiter does not set "trust proxy". Behind a hosting proxy, all users may share one IP, so one user could use up the limit for everyone. | `backend/src/app.js`, `backend/src/routes/assistant.js` | Before deploying, add `app.set('trust proxy', 1)` (or the value the platform documents) and test it. Not changed now because the platform is not chosen. **(to be confirmed with the approved platform)** |
| CORS falls back to `http://localhost:5173` if `FRONTEND_URL` is missing. | `backend/src/app.js:14` | Always set `FRONTEND_URL`. Check the `Access-Control-Allow-Origin` header in the first smoke test. |
| `npm run db:seed` deletes all orders and products. The README "Common problems" section also suggests running it. | `backend/prisma/seed.js:15-17`, `README.md` | Never run it on staging or on a database with work in it. Use `prisma migrate deploy` only. |
| `npm audit` reports 17 vulnerabilities (5 critical, 8 high, 4 moderate) in dependencies. | `package-lock.json` | Not fixed in this challenge (package upgrades were not allowed). Before a real public release, update the packages in a separate change, then run `npm run check` and the smoke test again. |
| `POST /api/orders` has no login and no rate limit. | `backend/src/routes/orders.js` | Keep staging private. Add a rate limit and login before any public release. |
| A checkout that times out in the browser (15 s) may still create an order. A retry could make a duplicate. | `frontend/src/services/api.js`, `CheckoutPage.jsx` | Low risk on a small staging database. Tell testers to check the order list before trying again. |
| The health check now returns 503 when the database is down. A platform may restart the API in a loop during a database outage. | `backend/src/app.js` | Use a grace period or retry count in the platform's health check settings. **(to be confirmed with the approved platform)** |
| The Gemini provider was unstable during testing (503 and timeouts). | `backend/src/services/gemini.js` | The fallback answer already works. Watch the logs for `fallback reason=` lines. Keep the key secret and watch the quota. |
| Client-side routes break on refresh if the static host does not rewrite paths. | Static hosting | Add a rewrite of all paths to `/index.html`. |

## 6. What stays the same as local

- The same code and the same `npm run check` must pass before each deploy.
- The same rule for data: fictional customers only, and no reseeding.
- The same evidence: save the health output and the smoke test output for staging too.
