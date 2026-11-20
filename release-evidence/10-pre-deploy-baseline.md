# AWS Deployment – Pre-deployment baseline (local)

**Date:** 2026-11-20
**Prepared by:** Stephanie Joy Revano (individual)
**Branch / code version:** `ASC_DEPLOYMENT_SHOPSMART_REVANO` @ `f4a0e54`

| Check | Expected | Observed | Result |
|---|---|---|---|
| Node version | >= 20.19 | v22.20.0 | Pass |
| `npx prisma migrate status` (backend/) | Schema up to date | 1 migration found, "Database schema is up to date!" | Pass |
| `npm run check` – lint | No errors | Frontend and backend lint clean | Pass |
| `npm run check` – tests | All pass | Frontend 15/15, backend 61/61 | Pass |
| `npm run check` – build | `frontend/dist` created | index.html, CSS 5.18 kB, JS 275.07 kB | Pass |
| http://localhost:3000/api/health | `{"status":"ok","database":"ok"}` | `{"status":"ok","database":"ok"}` | Pass |
| http://localhost:5173 | Six products shown | Six products shown (Study Lamp out of stock) | Pass |

Note: Prisma prints a warning that `package.json#prisma` is deprecated in Prisma 7. This project uses Prisma 6, so it is a warning only.

## Gaps found before deployment (against the AWS deployment guide)

1. No customer sign-in and no order ownership. The guide requires a fictional test customer to sign in, and the API to refuse a guest and a different customer when reading an order.
2. Express does not set `trust proxy`, which is needed behind Nginx for the rate limiter and secure cookies.
3. The frontend needs a same-origin API URL (`/api`) and an SPA rewrite on the web server.
