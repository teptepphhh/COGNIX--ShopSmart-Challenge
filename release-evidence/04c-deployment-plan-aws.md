# Deployment plan – AWS (as built)

**Prepared by:** Stephanie Joy Revano (individual) · **Date:** 2026-11-20 · **Replaces:** the platform-neutral plan in `04-deployment-plan.md`
**Diagram:** `04b-deployment-diagram-aws.png` · **Decision record:** `23-decision-record.md`

## 1. Where each part runs

| Part | AWS location | Address |
|---|---|---|
| Browser and frontend | Vite build (`frontend/dist`) served by Nginx on the EC2 instance | https://18-140-130-174.sslip.io |
| Express API | Node.js 22 process on the same EC2 instance, systemd service `shopsmart-api` | internal `127.0.0.1:3000`, public through Nginx at `/api/` |
| PostgreSQL | PostgreSQL 16 on the same EC2 instance (brief demo) | internal `127.0.0.1:5432` |
| AI provider | Not configured. Catalog-only mode, labelled in the UI | – |

## 2. Ports: public, internal and why

| Port | Open to | Used by | Why |
|---|---|---|---|
| 443 | Anywhere | Nginx (HTTPS) | The only way customers reach the site. Sign-in passwords travel only over HTTPS. |
| 80 | Anywhere | Nginx | Redirects to HTTPS. Also used by Let's Encrypt to issue the certificate. |
| 22 | My IP only (/32) | SSH administration | Limited to a trusted source, key-based login only. |
| 3000 | Not open (bound to 127.0.0.1) | Express API | Internal; Nginx forwards `/api/` to it. Tested: `http://18.140.130.174:3000` times out. |
| 5432 | Not open (bound to 127.0.0.1) | PostgreSQL | The browser never connects to the database. |

## 3. Configuration: variable names and value class (no secret values)

| Where | Name | Value class | Value / source |
|---|---|---|---|
| Frontend build (public, in browser JS) | `VITE_API_URL` | Public | `/api` (same origin). Rebuild if it changes. |
| API, `/etc/shopsmart/backend.env` (root:shopsmart 640) | `DATABASE_URL` | **Secret** | Generated on the server at setup; random password; never printed, committed or screenshotted |
| API | `HOST` | Public | `127.0.0.1` (keeps the API internal) |
| API | `PORT` | Public | `3000` |
| API | `NODE_ENV` | Public | `production` |
| API | `FRONTEND_URL` | Public | `https://18-140-130-174.sslip.io` (exact CORS origin) |
| API | `TRUST_PROXY` | Public | `1` (read client IP and HTTPS from Nginx) |
| API | `COOKIE_SECURE` | Public | `true` (session cookie only over HTTPS) |
| API | `GEMINI_API_KEY` | **Secret** | Empty on purpose (catalog-only mode). If added later: server only, never `VITE_` |
| EC2 key pair | `shopsmart-key.pem` | **Secret** | Only on my laptop in `%USERPROFILE%\.ssh` |

## 4. Migration history and data-preservation decision

| # | Migration | Created | What it does | Data effect |
|---|---|---|---|---|
| 1 | `20260910094640_initial_schema` | 2026-09-10 (starter) | Product, Order, OrderItem | – |
| 2 | `20261120090000_add_users_sessions_order_owner` | 2026-11-20 | User, Session, optional `Order.userId` | Adds only. Old orders keep `userId = NULL` |
| 3 | `20261120170000_order_idempotency_key` | 2026-11-20 | Optional `Order.idempotencyKey`, unique `(userId, idempotencyKey)` | Adds only. Old orders keep NULL (allowed by the unique index) |

**Decision:**
- Release environments use **`prisma migrate deploy` only**. `migrate dev`, `migrate reset` and `db push` are not used on AWS.
- `db:seed` deletes orders, so it ran **once**, on the brand-new empty AWS database during first setup (`deploy/ec2-user-data.sh` only seeds on first install). It never runs again.
- A `pg_dump` backup is taken **before every migration**: locally `backups/before-auth-migration.dump`; on AWS `deploy/update.sh` writes `/var/backups/shopsmart/before-update-<time>.dump` (first one: `before-update-20261120-091641.dump`).
- Evidence: local `screenshots/13-migration-deploy.png`, `13-migration-status-diff.png`, `19-local-migration-idempotency.png`; AWS `20-deploy-update-446488d.png`, `20-backup-before-update-and-version.png`.

## 5. Order of steps used

1. Local: baseline check, sign-in and ownership code, migration with backup, `npm run check`, manual tests (`15-auth-ownership-test.md`).
2. AWS account: Free plan, root MFA, zero-spend budget, Region Singapore (`11-aws-account-record.md`).
3. Push the tested branch, launch EC2 with `deploy/ec2-user-data.sh` (installs Node 22, PostgreSQL, Nginx, Certbot; creates the database and `backend.env`; `npm ci`; `migrate deploy`; first seed; build with `VITE_API_URL=/api`; systemd service; Nginx; HTTPS).
4. Hosted verification, 8 checks (`18-hosted-verification.md`).
5. Improvements: local test → push → `sudo bash /opt/shopsmart/deploy/update.sh` → retest (`24-improvements-and-retests.md`).

## 6. Demo dates and removal plan

| Item | Date |
|---|---|
| Deployed | 2026-11-20 16:31 (instance launch) |
| Demonstration / submission | 2026-11-20 (deadline 23:59) and while the instructor grades |
| Planned removal | **2026-11-27** (tag `RemoveBy` on the instance and volume) |
| Removal steps | `16-resource-register.md` → "Removal plan" |
