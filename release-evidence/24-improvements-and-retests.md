# Two improvements and retests

Both improvements came from problems seen in the earlier releases and in the hosted checks. The **BEFORE** evidence was taken on the hosted site at code `0b1e671`. The fix was committed as `446488d`, tested locally (`npm run check`: backend 76/76, frontend 15/15, build OK), deployed with `deploy/update.sh` (database backup first, `prisma migrate deploy`), and **retested on the same hosted URL**.

## Improvement 1 – Label catalog-only assistant answers

| | |
|---|---|
| Problem | The hosted server has no AI provider key, so every answer is a catalog fallback. The page still said "GROUNDED AI ASSISTANT" and "the AI answers…". Only a small note at the end of each answer hinted that no AI was used. The guide: *"If you use a mock provider, label it in the interface and report so the instructor can distinguish a simulated provider failure from a live call."* |
| Change | `GET /api/assistant/status` returns `{"mode":"catalog-only"}` or `{"mode":"live-ai"}`, and every answer includes `mode`. The page shows a clear badge: **"Catalog-only mode (no live AI)…"** (or "Live AI provider connected…"). Heading changed to "GROUNDED PRODUCT ASSISTANT". |
| Files | `backend/src/routes/assistant.js`, `frontend/src/pages/AssistantPage.jsx`, `frontend/src/services/api.js`, `frontend/src/styles.css`, test `backend/test/assistantMode.test.js` (2 tests) |
| Expected after (written before retest) | Same question gives the same grounded product, and the badge is visible above the form. |
| BEFORE | `screenshots/18-6a-assistant-keyboard-BEFORE-imp1.png` – no label, "GROUNDED AI ASSISTANT" |
| AFTER | `screenshots/21-imp1-AFTER-catalog-only-badge.png` – badge shown, Keyboard ₱1,850 with source #2 |
| Result | **Pass** |

## Improvement 2 – Idempotent checkout (no duplicate order on retry)

| | |
|---|---|
| Problem | Known limitation from the local release note: a checkout that times out in the browser and is retried could create a second order and decrement stock twice. |
| Change | The browser sends an `Idempotency-Key` per cart. The API stores it on the order with a unique `(userId, idempotencyKey)` index (migration `20261120170000_order_idempotency_key`, existing orders keep NULL). A repeat with the same key returns the first order with **200** and `Idempotent-Replayed: true`. Two simultaneous requests: the unique index lets only one transaction commit; the other is rolled back, stock included. |
| Files | `backend/prisma/schema.prisma`, migration, `backend/src/routes/orders.js`, `frontend/src/pages/CheckoutPage.jsx`, `frontend/src/services/api.js`, test `backend/test/idempotency.test.js` (5 tests) |
| Expected after (written before retest) | Attempt 1 = 201, attempt 2 with the same key = 200 with the same order id; USB Headset stock drops by 1 only. |
| BEFORE (hosted, `0b1e671`) | Same key twice → **201 order #2** and **201 order #3** (duplicate). `screenshots/19-imp2-BEFORE-duplicate-orders.png` |
| AFTER (hosted, `446488d`) | Same key twice → **201 order #4**, then **200 order #4, replayed: true**. Headset stock 5 → 4. `screenshots/21-imp2-AFTER-no-duplicate.png`, `21-imp2-AFTER-headset-stock-4.png` |
| Result | **Pass** |

## Deployment of the improvements

`screenshots/20-deploy-update-446488d.png` and `20-backup-before-update-and-version.png`: backup `before-update-20261120-091641.dump` created first, migration applied, API `active`, health ok, server at `446488d`.
