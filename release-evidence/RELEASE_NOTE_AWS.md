# ShopSmart Release Note – AWS hosted release

| Field | Value |
|---|---|
| Release | ShopSmart AWS hosted release 1 |
| Date | 2026-11-20 |
| Prepared by | Stephanie Joy Revano (individual task) |
| **Release type** | **Hosted** (online), fictional data and simulated checkout only |
| **Site URL** | **https://18-140-130-174.sslip.io** |
| Health URL | https://18-140-130-174.sslip.io/api/health |
| Repository / branch | https://github.com/teptepphhh/COGNIX--ShopSmart-Challenge/tree/aws-deployment-revano |
| **Code version** | **`446488d`** (first hosted deploy `0b1e671`; local baseline before this work `f4a0e54`) |
| AWS account plan | **Free plan** (advanced sign-up), US$120 credits available and US$0.00 used on 2026-11-20 (usage estimates update about every 24 h), free access ends 2027-05-20; root MFA on; zero-spend budget alert |
| Region | Asia Pacific (Singapore) `ap-southeast-1` |
| AWS services | Amazon EC2 (t3.micro `shopsmart-demo`, Ubuntu 24.04), Amazon EBS (20 GiB gp3), EC2 security group `shopsmart-web-sg`, EC2 key pair, public IPv4, AWS Budgets |
| On the instance | Nginx (HTTPS via Let's Encrypt, SPA rewrite, `/api` proxy), Node.js 22 + Express (systemd, 127.0.0.1:3000), PostgreSQL 16 (127.0.0.1:5432), Prisma 6 migrations |
| Planned removal | 2026-11-27 (see `16-resource-register.md`) |

## Tested URLs

`/`, `/products/2`, `/cart`, `/checkout`, `/login`, `/orders`, `/orders/1`, `/assistant`, `/api/health`, `/api/products`, `/api/orders/1`, `/api/auth/me`, `/api/assistant/status`, `http://18-140-130-174.sslip.io` (redirect), `http://18.140.130.174:3000/api/health` (blocked).

## What is new in this release

- **Customer sign-in** (register, sign in, sign out) with scrypt password hashes and an `HttpOnly`, `Secure`, `SameSite=Lax` session cookie. Only a hash of the session token is stored.
- **Order ownership enforced by the API:** checkout needs sign-in; the owner comes from the session; guest → 401, another customer → 404 on direct API requests. New **My Orders** and order detail pages.
- **Improvement 1:** assistant shows **catalog-only mode (no live AI)** when the server has no provider key.
- **Improvement 2:** **idempotent checkout**; a retried checkout with the same key returns the first order instead of creating a duplicate.
- Deployment files: `deploy/ec2-user-data.sh` (first setup), `deploy/update.sh` (backup → pull → migrate deploy → build → restart → check), `deploy/nginx-shopsmart.conf`, `deploy/shopsmart-api.service`.
- Migrations: `20261120090000_add_users_sessions_order_owner`, `20261120170000_order_idempotency_key`. Existing data is kept; no reset or reseed.

## Verification summary (hosted)

All 8 checks passed: frontend and direct routes, API connection over HTTPS, catalog and cart, account and order ownership, simulated checkout validation, assistant grounding and fallback, restart/reboot and logs, secrets and credits. Details and evidence: `18-hosted-verification.md`. Improvements and retests: `24-improvements-and-retests.md`.

Automated checks at `446488d`: lint clean, frontend 15/15, backend 76/76, build OK.

## Known limitations

- **Single EC2 host:** no high availability. Database backups are manual `pg_dump` files on the same instance (taken before each update).
- **Public IP hostname:** stopping and starting the instance would change the IP, the sslip.io hostname and the certificate. The instance stays running until grading.
- **No live AI provider:** the assistant runs in catalog-only mode (clearly labelled).
- **The cart is not saved** across a full page refresh (kept in browser memory, as before).
- Orders created before sign-in existed have no owner and cannot be read through the API.
- `npm audit` findings from the starter dependencies are unchanged (upgrades were out of scope).
- Open defects D3 and D4 from the local release note are unchanged.

## Operations

- Update: `ssh -i %USERPROFILE%\.ssh\shopsmart-key.pem ubuntu@18.140.130.174`, then `sudo bash /opt/shopsmart/deploy/update.sh`.
- Logs: `sudo journalctl -u shopsmart-api -n 50`. Setup log: `/var/log/shopsmart-setup.log`.
- Backups: `/var/backups/shopsmart/` (postgres only).

## Evidence index

`10-pre-deploy-baseline.md`, `11-aws-account-record.md`, `15-auth-ownership-test.md` (local), `16-resource-register.md`, `18-hosted-verification.md`, `22-secrets-check.txt`, `23-decision-record.md`, `24-improvements-and-retests.md`, `04b-deployment-diagram-aws.svg/.png`, `screenshots/10-*` to `25-*` (redacted).
