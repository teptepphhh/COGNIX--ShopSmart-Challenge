# Sign-in and order ownership – local test record

**Date:** 2026-11-20
**Branch:** `ASC_AWS_DEPLOY_REVANO` (based on `f4a0e54`)
**Tested by:** Stephanie Joy Revano (individual)
**Environment:** local (Windows, Node 22.20.0, PostgreSQL 18), http://localhost:5173 and http://localhost:3000
**Data:** fictional test customers only. Checkout is simulated.

## Why this change was needed

The AWS deployment guide requires a fictional test customer to sign in and complete a simulated order, and the API to enforce access to private order records:
"Guest is refused private data; owner succeeds; another customer is denied by direct API request."
The starter had no sign-in and no way to read an order back (`orders.js` only had a `WEEK 4 IMPROVEMENT` comment).

## What changed

| Area | Change |
|---|---|
| Database | Migration `20261120090000_add_users_sessions_order_owner`: new `User` and `Session` tables, optional `Order.userId`. Nothing is deleted. Old orders keep `userId = NULL`. |
| Passwords | Stored only as a scrypt hash with a random salt (`node:crypto`). Never logged or returned. |
| Sessions | Random token in an `httpOnly`, `SameSite=Lax` cookie. Only the SHA-256 hash of the token is stored. `Secure` is turned on with `COOKIE_SECURE=true` on HTTPS. 8-hour expiry. |
| API | `POST /api/auth/register`, `POST /api/auth/login` (rate limited, same 401 for wrong password and unknown email), `POST /api/auth/logout`, `GET /api/auth/me`. All `/api/orders` routes require sign-in. The order owner comes from the session, never from the request body. `GET /api/orders/:id` filters by `id` **and** `userId` in the database query. |
| Proxy | `TRUST_PROXY` setting so the rate limiter and secure cookies work behind Nginx. |
| Frontend | Sign in / Register page, My Orders, order details, Sign out. Checkout asks a guest to sign in and keeps the cart. |

**Why 404 and not 403 for another customer's order:** a 403 would confirm that order #12 exists. A 404 gives the same answer as a missing order, so order numbers cannot be probed.

**Identity note:** this is ShopSmart customer identity. It is separate from AWS IAM, which only controls who may manage AWS resources.

## Data-preservation steps

| Step | Command | Result |
|---|---|---|
| Backup before migration | `pg_dump -F c -f backups\before-auth-migration.dump` | 11,382-byte dump created (folder is in `.gitignore`) |
| Status before | `npx prisma migrate status` | 2 found, 1 not applied |
| Apply | `npx prisma migrate deploy` (not `migrate dev`, not `db:seed`) | "All migrations have been successfully applied." |
| Status after | `npx prisma migrate status` | "Database schema is up to date!" |
| Schema match | `npx prisma migrate diff --from-schema-datasource ... --to-schema-datamodel ... --script` | "-- This is an empty migration." |

Existing products and earlier orders (#1–#11) were kept.

## Automated checks (`npm run check`)

Lint clean. Frontend 15/15. Backend 69/69 (61 earlier + 8 new in `test/auth.test.js`). Build OK.

## Manual checks

| # | Check | Expected (written before running) | Observed | Result | Evidence |
|---|---|---|---|---|---|
| A1 | Register Ana Santos (ana.test@example.com) | Account created, signed in, sent to My Orders | Signed in, "No orders yet" | Pass | `15-a1`, `15-a2` |
| A2 | Ana checks out 1 Wireless Mouse | Name and email pre-filled, order saved with Ana as owner | Order **#12**, ₱650.00 | Pass | `15-a3`–`15-a5` |
| A3 | Ana opens /orders/12 | Owner sees the order | Order #12 details shown | Pass | `15-a6` |
| G1 | Guest opens /orders/12 in the app | Redirect to sign-in, order not shown | `/login?next=/orders/12` | Pass | `15-c` |
| G2 | Guest calls `GET http://localhost:3000/api/orders/12` directly | 401 `AUTH_REQUIRED` | `{"error":{"code":"AUTH_REQUIRED",...}}` | Pass | `15-d` |
| B1 | Register Ben Reyes (ben.test@example.com) | My Orders is empty (Ana's order not listed) | "No orders yet" | Pass | `15-e1`, `15-e2` |
| B2 | Ben opens /orders/12 in the app | "Order could not be found." | "Order could not be found." | Pass | `15-f` |
| B3 | Ben calls `GET http://localhost:3000/api/orders/12` directly | 404 `ORDER_NOT_FOUND` | `{"error":{"code":"ORDER_NOT_FOUND",...}}` | Pass | `15-g` |

All screenshots are in `release-evidence/screenshots/`.
