# Hosted Verification Plan

> Results of the 2026-11-20 run: [evidence/EVIDENCE.md](evidence/EVIDENCE.md) (all checks PASS).

Write the expected result **before** running each check. Use a fresh browser (or private window) and the real URL
`https://3-104-192-31.sslip.io`. Record the code version (`git rev-parse --short HEAD`), status codes and redacted evidence.

| # | Check | How | Expected (written before testing) | Actual | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | Frontend and direct route | Open `/`, then open `/assistant` directly and press F5 | Home loads; refresh still shows the app (no 404) | | |
| 2 | API connection | DevTools → Network on the home page; open `/api/health` | Requests go to `https://…/api/...`; health returns `{"status":"ok","database":"ok"}` | | |
| 3 | Catalog and cart | Search `keyboard`, add to cart, change quantity | Current products appear; totals update correctly | | |
| 4a | Guest refused | `curl -i $URL/api/orders` | `401 AUTH_REQUIRED` | | |
| 4b | Owner succeeds | Sign in as test customer A, place order, open *My orders* | Order appears; `/orders/<id>` shows it | | |
| 4c | Other customer denied | Customer B requests A's order directly (curl below) | `404 ORDER_NOT_FOUND` | | |
| 5a | Simulated checkout | Valid fictional order | `201`, order number shown, stock reduced | | |
| 5b | Invalid / excess quantity | Quantity 0, or more than stock (curl below) | `422 INVALID_ORDER` / `409 INSUFFICIENT_STOCK` | | |
| 6a | Assistant match | `Which keyboard is below ₱2,000?` | Recommends a keyboard ≤ ₱2,000 with links to real products | | |
| 6b | Assistant no match | `Do you sell refrigerators?` | Clear no-match message, no products | | |
| 6c | Provider unavailable | No `GEMINI_API_KEY` on server | Labeled "catalog-verified" fallback answer | | |
| 6d | Invalid input | `hi` | `422 INVALID_QUESTION` | | |
| 7 | Restart and logs | `sudo systemctl restart shopsmart-api`; reboot instance | API returns after restart/reboot; `journalctl` shows request IDs and no secrets | | |
| 8 | Secrets | `git grep -nE "SESSION_SECRET=.{10}|postgresql://[^:]+:[^@]{12,}@"`; search `dist/` for `DATABASE_URL` | No secret in repo, browser files or screenshots | | |
| 9 | Credits | Billing console | Usage within Free plan credits | | |

## Direct API requests for ownership checks

```bash
URL=https://3-104-192-31.sslip.io
# Customer A
curl -s -c a.txt -H 'Content-Type: application/json' -d '{"name":"Test Customer A","email":"a@example.test","password":"demo-pass-A1"}' $URL/api/auth/register
curl -s -b a.txt -H 'Content-Type: application/json' -d '{"customerName":"Test Customer A","email":"a@example.test","address":"123 Fictional Street, Demo City","items":[{"productId":PRODUCT_ID,"quantity":1}]}' $URL/api/orders
# Customer B tries to read A's order
curl -s -c b.txt -H 'Content-Type: application/json' -d '{"name":"Test Customer B","email":"b@example.test","password":"demo-pass-B2"}' $URL/api/auth/register
curl -i -b b.txt $URL/api/orders/ORDER_ID_FROM_A        # expect 404
curl -i $URL/api/orders                                  # guest: expect 401
# Excess quantity
curl -i -b a.txt -H 'Content-Type: application/json' -d '{"customerName":"Test Customer A","email":"a@example.test","address":"123 Fictional Street, Demo City","items":[{"productId":PRODUCT_ID,"quantity":20}]}' $URL/api/orders
```

## Symptom → where to look

| What you see | Investigate |
| --- | --- |
| Blank page or build failure | `02-release.sh` output, `frontend/dist`, missing import, `VITE_API_URL` |
| Home works, refresh of a route gives 404 | Nginx `try_files ... /index.html` in `/etc/nginx/sites-available/shopsmart` |
| Page loads but no products | DevTools Network → `/api/products` status; `journalctl -u shopsmart-api`; `/api/health` database field |
| Health OK but checkout fails | Response code (401 = not signed in, 422 validation, 409 stock); `prisma migrate status`; server log trace ID |
| Sign-in seems to work but protected requests fail | Site must be on HTTPS (cookie is `Secure` in production); check the `shopsmart_session` cookie in DevTools; `FRONTEND_URL` |
| Assistant spins or cites unknown product | API log, provider timeout (8 s), response validation; fallback should appear |
| 502 Bad Gateway | `systemctl status shopsmart-api`; missing setting in `/etc/shopsmart/backend.env` (server exits with a clear message) |

Change one setting at a time and record old and new values.
