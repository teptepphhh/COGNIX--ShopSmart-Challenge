# Release Note: ShopSmart Hosted Demo

| Field | Value |
| --- | --- |
| Release type | Hosted (AWS EC2, single host) |
| URL | https://3-104-192-31.sslip.io |
| Branch | `ASC_AI_ASSISTANT_SHOPSMART_SAMBILE` |
| Code version | Base `b0a07b5` + this release's changes (update with the pushed commit hash) |
| Date | 2026-11-20 |
| AWS plan / Region | Free plan · ap-southeast-2 (Sydney) |

## What changed

1. **Customer accounts:** register, sign in, sign out (`/api/auth/*`). Passwords are hashed with scrypt; the session is an HMAC-signed, HttpOnly, SameSite=Lax cookie that is `Secure` in production.
2. **Order ownership:** checkout requires sign-in; orders store `userId`; `GET /api/orders` lists only the customer's own orders; `GET /api/orders/:id` returns 404 for another customer's order. New migration `20261120060000_add_users_and_order_owner` (existing orders are kept, with no owner).
3. **Deployment readiness:** `/api/health` checks the database; the server refuses to start in production without `DATABASE_URL`, `FRONTEND_URL` and a 32+ character `SESSION_SECRET`; API binds to `127.0.0.1`; `trust proxy` behind Nginx; frontend uses a same-origin `/api`.
4. **Deployment files:** Nginx site, systemd service, setup/release/backup scripts and these docs.

## The two improvements and retests

| Improvement | Retest | Result |
| --- | --- | --- |
| 1. Server-enforced order ownership with customer sign-in | Verification checks 4a–4c (guest 401, owner 200, other customer 404 by direct API request) | PASS (2026-11-20), see [evidence](evidence/EVIDENCE.md) |
| 2. Hosted HTTPS release with operations support (health checks DB, systemd restart, migrations via `migrate deploy`) | Checks 1, 2 and 7 (route refresh, HTTPS health, recovery after restart and reboot) | PASS (2026-11-20), see [evidence](evidence/EVIDENCE.md) |

## Known limitations

- Single EC2 host: no redundancy; backups are manual (`03-backup.sh`).
- Sessions are stateless: sign-out clears the cookie, but a copied cookie stays valid until it expires (8 hours).
- No Gemini key is configured, so the assistant uses labeled, catalog-verified rule-based answers.
- Fictional data and simulated checkout only.
