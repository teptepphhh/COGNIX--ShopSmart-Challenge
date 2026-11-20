# ShopSmart Hosted Deployment Evidence

| Field | Value |
| --- | --- |
| Hosted URL | https://3-104-192-31.sslip.io |
| Release type | Hosted, single EC2 host (Nginx + Express + PostgreSQL) |
| AWS plan / Region | Free plan (US$100 credits, 182 days remaining at time of check) · Asia Pacific (Sydney) `ap-southeast-2` |
| Instance | `shopsmart-demo` · t3.small · Ubuntu 24.04 LTS · Elastic IP `3.104.192.31` |
| Code version | Branch `ASC_AI_ASSISTANT_SHOPSMART_SAMBILE`, base commit `b0a07b5` plus the uncommitted changes in this release (customer accounts, order ownership, deployment files). Record the new commit hash here after pushing. |
| Date checked | 2026-11-20 (Asia/Manila) |
| Data | Fictional test customers (`…@example.test`) and simulated checkout only |

Raw evidence in this folder: [`deploy-log-2026-11-20.txt`](deploy-log-2026-11-20.txt), [`api-checks-2026-11-20.json`](api-checks-2026-11-20.json), [`server-checks-2026-11-20.txt`](server-checks-2026-11-20.txt) and the screenshots listed below. Account ID and session cookie values are redacted.

## Results against the verification plan

| # | Check | Expected (written before testing) | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | Frontend and direct route | Home loads over HTTPS; a direct load of a React route still shows the app | Home loads with valid Let's Encrypt certificate; direct load of `/assistant` and `/checkout` render the app (Nginx SPA fallback) | PASS | `01-home-https.jpg`, `03-assistant-direct-route-and-answer.jpg`, `04-guest-checkout-requires-sign-in.jpg` |
| 2 | API connection | Browser calls same-origin `https://…/api`; health returns ok with database ok | `GET /api/health` → `200 {"status":"ok","database":"ok"}`; HSTS and nosniff headers present | PASS | `api-checks…json` (health), `server-checks…txt` |
| 3 | Catalog and cart | Six current products; search filters | `GET /api/products` → 6 products; search `keyboard` → Compact Mechanical Keyboard | PASS | `api-checks…json`, `01-home-https.jpg` |
| 4a | Guest refused | `401 AUTH_REQUIRED` on private order data | `GET /api/orders` → 401; `GET /api/orders/1` → 401; guest `POST /api/orders` → 401; checkout page asks to sign in | PASS | `05-guest-api-order-401.jpg`, `04-guest-checkout-requires-sign-in.jpg` |
| 4b | Owner succeeds | Customer A can create and read own order | Order #1 created (`201`, `userId` 1, ₱650); `GET /api/orders/1` → 200; list → `[1]` | PASS | `api-checks…json` |
| 4c | Other customer denied | Customer B gets 404 for A's order by direct API request | `GET /api/orders/1` as B → `404 ORDER_NOT_FOUND`; B's list is empty | PASS | `api-checks…json` |
| 5a | Simulated checkout | Valid order saved, stock reduced | `201`; Wireless Mouse stock 12 → 11 | PASS | `api-checks…json` |
| 5b | Invalid / excess quantity | Quantity 0 → 422; above stock → 409 | `422 INVALID_ORDER` ("expected number to be >=1"); `409 INSUFFICIENT_STOCK` ("Only 11 unit(s)…") | PASS | `api-checks…json` |
| 6a | Assistant match | Keyboard ≤ ₱2,000 recommended with real product link | Compact Mechanical Keyboard ₱1,850, product #2, source #2 | PASS | `03-assistant-direct-route-and-answer.jpg` |
| 6b | Assistant no match | Clear no-match, no products | "I could not find an in-stock product matching that request.", `answerMode: no_match` | PASS | `api-checks…json` |
| 6c | Provider unavailable | Labeled catalog-verified fallback | No provider key on server: UI shows "AI phrasing is unavailable or could not be verified. Showing a catalog-verified answer." (`answerMode: fallback`) | PASS | `03-assistant-direct-route-and-answer.jpg` |
| 6d | Invalid input | `hi` → 422 | `422 INVALID_QUESTION` | PASS | `api-checks…json` |
| 7 | Restart and logs | API recovers after service restart and full reboot; logs traceable, no secrets | `systemctl restart` → active, health ok; `sudo reboot` → health ok ~40 s later, order data persisted (stock still 11); logs show request IDs, method, path, status, timing only | PASS | `server-checks…txt`, `07-reboot-command.jpg` |
| 8 | Secrets | No secret in repo, browser files or screenshots | 0 secret strings in `/var/www/shopsmart`; 0 git-tracked `.env` files; `/etc/shopsmart/backend.env` is `600`; session cookie `HttpOnly; Secure; SameSite=Lax` and not readable by page JavaScript; account ID redacted in screenshots | PASS | `server-checks…txt`, `api-checks…json` |
| 9 | Network exposure | Only 22/80/443 public; API and DB internal | Sockets: Express `127.0.0.1:3000`, PostgreSQL `127.0.0.1:5432`, Nginx `:80/:443`; security group allows 22 (team IP + EC2 Instance Connect), 80, 443 only | PASS | `server-checks…txt`, `08-aws-security-group-inbound-rules.jpg` |
| 10 | Credits | Usage within Free plan | Free plan, US$100 credits remaining, 182 days; t3.small with standard CPU credits | PASS | `11-aws-free-plan-credits.png`, `09-aws-instance-running-elastic-ip.jpg` |

## Two improvements and retests

1. **Server-enforced order ownership with customer sign-in.** Retested with checks 4a–4c (guest 401, owner 200, second customer 404 by direct API request): **PASS**.
2. **Hosted HTTPS release with operations support** (DB-aware health check, systemd restart on failure and at boot, `prisma migrate deploy` for the new migration). Retested with checks 1, 2 and 7: **PASS**. The new migration `20261120060000_add_users_and_order_owner` applied cleanly on the hosted PostgreSQL (`deploy-log…txt`).

## Screenshots

| File | Shows |
| --- | --- |
| `01-home-https.jpg` | Hosted home page over HTTPS |
| `03-assistant-direct-route-and-answer.jpg` | Direct load of `/assistant`, grounded answer with labeled fallback |
| `04-guest-checkout-requires-sign-in.jpg` | Guest checkout blocked until sign-in |
| `05-guest-api-order-401.jpg` | Direct guest API request to an order → 401 |
| `07-reboot-command.jpg` | Server reboot used for the recovery test |
| `08-aws-security-group-inbound-rules.jpg` | Inbound rules (account ID redacted) |
| `09-aws-instance-running-elastic-ip.jpg` | `shopsmart-demo` running with Elastic IP 3.104.192.31 |
| `10-aws-elastic-ip-associated.jpg` | Elastic IP associated with the instance |
| `11-aws-free-plan-credits.png` | Free plan status: US$100 credits, 182 days |

## Notes and limitations

- The browser screenshots of sign-in and *My orders* were not captured by the assistant; take them yourself (sign in with a fictional test account, place an order, open *My orders*) and add them as `12-…` and `13-…`.
- `npm ci` reported 18 dependency vulnerabilities in the starter's packages; not changed in this release.
- Temporary log files used during setup were removed from the web root after collection.
