# Hosted verification – ShopSmart on AWS EC2

**Site URL:** https://18-140-130-174.sslip.io
**Deployed code version (first deploy):** `0b1e671` on branch `aws-deployment-revano`
**Host:** EC2 `shopsmart-demo` (`i-0833bb2383c00f026`), t3.micro, Ubuntu 24.04, ap-southeast-1
**Tester:** Stephanie Joy Revano · fresh browser window (Incognito) · fictional data only
**Expected results written:** 2026-11-20 16:40 (before running any check)

| # | Check | Expected observation (written first) | Observed | Result | Evidence |
|---|---|---|---|---|---|
| 1 | Frontend and direct route | Home page loads over HTTPS with six products. Typing `/cart` and `/products/2` directly and pressing refresh still shows the app (no Nginx 404). `http://` redirects to `https://`. | | | |
| 2 | API connection | DevTools Network shows `GET https://18-140-130-174.sslip.io/api/products` = 200 (same origin, no CORS or mixed-content error). `/api/health` = `{"status":"ok","database":"ok"}`. Port 3000 is not reachable from the internet. | | | |
| 3 | Catalog and cart | Six products from PostgreSQL. Search "keyboard" shows only the keyboard. Quantity changes update the line total and cart total. | | | |
| 4 | Account and order | Guest: `GET /api/orders/<id>` = 401 `AUTH_REQUIRED`. Owner: order details shown. Another customer: direct API request = 404 `ORDER_NOT_FOUND`. Session cookie is `HttpOnly`, `Secure`, `SameSite=Lax`. | | | |
| 5 | Simulated checkout | Valid fictional order is saved and appears in My Orders. Invalid email = 422 refused. Quantity above stock = 409 refused, stock unchanged. | | | |
| 6 | Assistant | Recommended products and links match current catalog prices. A question with no match gets an honest "no match" answer. With no AI key on the server, answers use the catalog fallback and say so. | | | |
| 7 | Restart and logs | After `systemctl restart shopsmart-api` and after a full instance reboot, the site and `/api/health` recover without manual steps. `journalctl -u shopsmart-api` shows request lines and errors with trace IDs but no password, `DATABASE_URL` or key. | | | |
| 8 | Secrets and credits | No secret in the git repository, in the built browser JavaScript, or in screenshots. Billing shows credits still within the Free plan. | | | |
