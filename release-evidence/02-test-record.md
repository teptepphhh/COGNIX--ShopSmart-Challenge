# Activity 2 – Customer Journey Test Record

**Tester / recorder:** Stephanie Joy Revano (solo project)
**Date:** 2026-11-11
**Branch / commit:** ASC_DEPLOYMENT_SHOPSMART_REVANO / 7824028
**Environment:** Local – Frontend http://localhost:5173, API http://localhost:3000, PostgreSQL localhost:5432
**Browser:** Google Chrome, DevTools Network tab (Fetch/XHR filter, No throttling, Disable cache)
**Test data:** fictional customer details only

Authentication and roles are absent in this version, so guest/owner/other-customer test cases are not applicable.

---

## Case 1 – Browse and search

### 1a. Search with results
| Field | Record |
|---|---|
| Starting state | Home page loaded, 6 products, search box empty, Category "All" |
| Action and test data | Type `keyboard` in "Search products" |
| Expected result | Only "Compact Mechanical Keyboard" (₱1,850.00) is shown; request `GET /api/products?search=keyboard` returns 200 |
| Observed result and evidence | One product card shown: "Compact Mechanical Keyboard" (Accessories). Request `GET /api/products?search=keyboard` → 200 OK, 287 bytes, 31 ms; `Access-Control-Allow-Origin: http://localhost:5173`. Evidence: `screenshots/02-1a-search-keyboard.png`, `screenshots/02-1a-search-keyboard-status.png` |
| Decision | Pass |

### 1b. Search with no results
| Field | Record |
|---|---|
| Starting state | Home page, search box cleared |
| Action and test data | Type `printer` in "Search products" |
| Expected result | No product cards; message "No products match your filters." is shown; request returns 200 with an empty list |
| Observed result and evidence | No product cards; message "No products match your filters." shown. Request `GET /api/products?search=printer` → 200 OK, Content-Length 15 (`{"products":[]}`). Loading ended normally. Evidence: `screenshots/02-1b-search-no-results.png` |
| Decision | Pass |

### 1c. Category filter combined with search
| Field | Record |
|---|---|
| Starting state | Home page, search box cleared |
| Action and test data | Select Category `Study`, then type `webcam` |
| Expected result | No products (webcam is in "Video"); "No products match your filters." is shown; the Category list still contains all categories |
| Observed result and evidence | No product cards; message "No products match your filters." shown. Request `GET /api/products?search=webcam` → 200 OK, Content-Length 269 (the API returns the webcam; the client-side "Study" filter correctly hides it). Category list still shows All, Accessories, Study, Video, Audio. Evidence: `screenshots/02-1c-category-search.png`. The category list was checked by opening the dropdown; there is no separate screenshot of the open list. |
| Decision | Pass |

---

## Case 2 – Cart

| Field | Record |
|---|---|
| Starting state | Cart (0); Wireless Mouse ₱650 (stock 4), Laptop Stand ₱1,200 (stock 7) |
| Action and test data | Steps 2.1–2.8 in the table below, run in one session without reloading until step 2.8 |
| Expected result | Totals and item counts match the expected values at every step; invalid quantities are refused without changing the cart |
| Observed result and evidence | See the step table below |
| Decision | **Fail** – step 2.5 changed the cart quantity unexpectedly (Defect D1); step 2.6 shows a minor style issue (Defect D2). All totals were arithmetically correct for the quantities shown. |

| Step | Action | Expected items / total | Observed items / total | Notes |
|---|---|---|---|---|
| 2.1 | Add Wireless Mouse | 1 / ₱650 | 1 / ₱650 – header Cart (1) | Message "Wireless Mouse was added to your cart." – Pass. `screenshots/02-2-cart-step1.png` |
| 2.2 | Add Laptop Stand | 2 / ₱1,850 | 2 / ₱1,850 – header Cart (2) | Message "Laptop Stand was added to your cart." – Pass. `screenshots/02-2-cart-step2.png` |
| 2.3 | Open Cart, click **+** on Wireless Mouse | 3 / ₱2,500 | 3 / ₱2,500 | Mouse 2 × ₱650 = ₱1,300; Laptop Stand ₱1,200; **−** disabled on Laptop Stand at quantity 1 – Pass. `screenshots/02-2-cart-step3.png` |
| 2.4 | Click **+** until the Mouse quantity is 4 | 5 / ₱3,800 | 5 / ₱3,800 | Mouse 4 × ₱650 = ₱2,600; **+** disabled at stock limit 4 – Pass. `screenshots/02-2-cart-step4.png` |
| 2.5 | Select the Mouse quantity (`Ctrl + A`) and type `10` | 5 / ₱3,800 (unchanged) | **2 / ₱1,850** – Mouse quantity became **1** | Error message "Only 4 unit(s) are available." shown in red, but the first keystroke `1` was saved as the quantity before `0` was refused – **Fail (D1)**. `screenshots/02-2-cart-step5.png` |
| 2.6 | Mouse restored to 4 with **+**; select the quantity and type `0` | 5 / ₱3,800 (unchanged) | 5 / ₱3,800 – quantity stayed 4 | Message "Quantity must be a whole number greater than zero." shown in the **info (teal) style**, not the red error style – Pass with minor defect **D2**. `screenshots/02-2-cart-step6.png` |
| 2.7 | Click **Remove** on Laptop Stand | 4 / ₱2,600 | 4 / ₱2,600 – header Cart (4) | Message "Item removed from cart." – Pass. `screenshots/02-2-cart-step7.png` |
| 2.8 | Press **F5** (refresh) | Team design: cart kept in React state only, so it empties | 0 / – header Cart (0), "Your cart is empty" | Matches the current design – Pass (known limitation: cart is not persisted). `screenshots/02-2-cart-step8-refresh.png` |





---

## Case 3 – Simulated checkout

Stock of Wireless Mouse before Case 3: `GET /api/products/1` → `"stock":4`, `updatedAt` 2026-11-05. Evidence: `screenshots/02-3-stock-before.png`

### 3a. Invalid email is refused
| Field | Record |
|---|---|
| Starting state | Cart (1): Wireless Mouse × 1; checkout form open |
| Action and test data | Name `Juan Dela Cruz`, email `juan@test`, address `123 Mabini Street, Sample City`; click "Place simulated order" |
| Expected result | The browser allows the value (HTML email check), but the server refuses it with 422; an error is shown; no order is created; the cart is unchanged |
| Observed result and evidence | `POST /api/orders` → **422 Unprocessable Entity**. Page shows "Check the customer and cart information." in the error style; button returned to "Place simulated order"; form values kept. Response `details.fieldErrors`: `{email: ["Invalid email address"]}`. Evidence: `screenshots/02-3a-checkout-invalid-email.png`, `screenshots/02-3a-status.png`, `screenshots/02-3a-response-details.png` |
| Decision | **Pass** (input refused). Minor defect **D3**: the page does not say which field is wrong. |

### 3b. Address containing only spaces is refused
| Field | Record |
|---|---|
| Starting state | Same cart; form open after 3a |
| Action and test data | Email changed to `juan.delacruz@example.com`; address set to 12 spaces; click "Place simulated order" |
| Expected result | The browser allows 12 spaces (`required` and `minLength="10"` pass), but the server trims the value and refuses it with 422; no order is created |
| Observed result and evidence | `POST /api/orders` → **422**. Same message "Check the customer and cart information." Response `details.fieldErrors`: `{address: ["Too small: expected string to have >=10 characters"]}`. Evidence: `screenshots/02-3b-checkout-blank-address.png`, `screenshots/02-3b-response-details.png` |
| Decision | **Pass** (server-side validation catches what the browser allows). Same minor defect **D3**. |

### 3c. Valid fictional details create one order
| Field | Record |
|---|---|
| Starting state | Same cart (Wireless Mouse × 1); stock 4 |
| Action and test data | Name `Juan Dela Cruz`, email `juan.delacruz@example.com`, address `123 Mabini Street, Barangay Uno, Sample City`; click "Place simulated order" **once** |
| Expected result | 201; one order created with the server's price; confirmation with order number and total ₱650.00; cart cleared; Mouse stock reduced from 4 to 3 |
| Observed result and evidence | `POST /api/orders` → **201**, 186 ms (only one 201 request in the log). Page: "Thank you, Juan Dela Cruz!", order **#9**, Total **₱650.00**; header Cart (0). Response: `id 9`, `status "PENDING"`, `total 650`, `items [{productId 1, quantity 1, unitPrice 650}]`, `createdAt 2026-11-12T14:11:04.262Z`. After the order, `GET /api/products/1` → `"stock":3`, `updatedAt 2026-11-12T14:11:04.240Z` (same transaction). Evidence: `screenshots/02-3c-checkout-success.png`, `screenshots/02-3c-response-details.png`, `screenshots/02-3c-stock-after-order.png` |
| Decision | **Pass** |

---


---

## Case 4 – Stock rule

### 4a. Out-of-stock product cannot be added in the browser
| Field | Record |
|---|---|
| Starting state | USB-C Study Lamp (product 3) has stock 0 |
| Action and test data | View the product card on the home page, then open its Details page |
| Expected result | The product is shown as unavailable and "Add to cart" is disabled on both pages |
| Observed result and evidence | Card shows "Out of stock" in red with a disabled "Add to cart" button. Details page (`/products/3`) shows "0 unit(s) available" with a disabled "Add to cart" button. Evidence: `screenshots/02-4a-lamp-out-of-stock.png`, `screenshots/02-4a-lamp-details.png` |
| Decision | **Pass** |

### 4b. Direct API order for an out-of-stock product is refused
| Field | Record |
|---|---|
| Starting state | Study Lamp stock 0 (`updatedAt` 2026-10-08) |
| Action and test data | Bypass the browser: `curl.exe -i -X POST http://localhost:3000/api/orders` with fictional customer details and `items: [{productId: 3, quantity: 1}]` |
| Expected result | 409 `INSUFFICIENT_STOCK`; no order created; stock stays 0 |
| Observed result and evidence | **`HTTP/1.1 409 Conflict`**, body `{"error":{"code":"INSUFFICIENT_STOCK","message":"Only 0 unit(s) of USB-C Study Lamp are available."}}` (Content-Length 101). Afterwards `GET /api/products/3` → `"stock":0`, `updatedAt` still 2026-10-08 (unchanged). Evidence: `screenshots/02-4b-api-insufficient-stock.png`, `screenshots/02-4b-lamp-stock-unchanged.png` |
| Decision | **Pass** – the stock rule is enforced on the server, not only by the disabled button |

### 4c. Two customers buy the same product (stale cart)
| Field | Record |
|---|---|
| Starting state | 1080p Webcam (product 4) stock 4. Two browser tabs, each with its own cart |
| Action and test data | **Tab A:** add Webcam, set quantity to 4 (₱5,800), do not check out yet. **Tab B:** add Webcam × 1 and check out as `Maria Santos`, `maria.santos@example.com`, `45 Rizal Avenue, Barangay Dos, Sample City`. **Tab A:** check out the 4 webcams as `Juan Dela Cruz` |
| Expected result | Tab B succeeds and stock becomes 3. Tab A is refused with "Only 3 unit(s) of 1080p Webcam are available."; no order is created for Tab A; Tab A's cart is unchanged; final stock 3 |
| Observed result and evidence | Before: `"stock":4`. Tab A cart: Webcam × 4, total ₱5,800, header Cart (4). Tab B: "Thank you, Maria Santos!", order **#10**, Total **₱1,450.00**, Cart (0). Tab A checkout: error "Only 3 unit(s) of 1080p Webcam are available." shown in the error style; header still Cart (4); order review still Qty 4, ₱5,800; no confirmation shown. After: `GET /api/products/4` → `"stock":3`, `updatedAt 2026-11-12T14:28:44.497Z` (only Maria's order reduced the stock). Evidence: `screenshots/02-4c-webcam-stock-before.png`, `screenshots/02-4c-tabA-cart.png`, `screenshots/02-4c-tabB-order-success.png`, `screenshots/02-4c-tabA-insufficient-stock.png`, `screenshots/02-4c-webcam-stock-after.png` |
| Decision | **Pass** – backend log shows `POST /api/orders 201` (Maria, #10) followed by `POST /api/orders 409` (Tab A). Evidence: `screenshots/02-5-backend-log.png` |

Note: Tab A's cart allowed quantity 4 because the cart copies `stock` when an item is added and does not refresh it (baseline observation 11). This is a UX limitation only; the server is the real guard.



---

## Case 5 – Product assistant

Backend log for this case: `screenshots/02-5-backend-log.png`. During testing the Gemini provider returned **HTTP 503** for one question and **timed out (8 s)** for another, so the server used its catalog-based fallback. The key is configured (no `NO_KEY` reason was logged); the failures came from the provider. A live Gemini answer was therefore not observed in this session.

### 5a. Supported catalog question
| Field | Record |
|---|---|
| Starting state | Assistant page; Compact Mechanical Keyboard (product 2) ₱1,850, stock 7 |
| Action and test data | Ask `Which keyboard is below ₱2,000?` |
| Expected result | Recommends Compact Mechanical Keyboard at ₱1,850 with a source link to product #2; no invented products or prices; if the AI is unavailable, a clear note is shown |
| Observed result and evidence | `POST /api/assistant/questions` → **200 OK** (≈4.2 s). Answer: "Based on the current ShopSmart catalog, consider: Compact Mechanical Keyboard (₱1,850). (AI assistant unavailable — showing catalog-based results.)" Recommendation "Compact Mechanical Keyboard — ₱1,850"; Sources: "Compact Mechanical Keyboard (product #2)". Backend log: `[assistant] fallback reason=PROVIDER_ERROR status=503`. Clicking the source opened `/products/2` showing the same product at ₱1,850.00. Evidence: `screenshots/02-5a-assistant-keyboard.png`, `screenshots/02-5a-source-link.png` |
| Decision | **Pass** – correct product, price and source (fallback mode) |

### 5b. Unsupported question (no match)
| Field | Record |
|---|---|
| Starting state | Assistant page; the catalog has no printers |
| Action and test data | Ask `Do you sell printers?` |
| Expected result | Honest no-match answer; no products or sources; the AI provider is not called |
| Observed result and evidence | Answer: "I could not find an in-stock ShopSmart product matching that request." No recommendations and no Sources list. Backend log: `POST /api/assistant/questions 200 3.833 ms` with no fallback line (provider not called). Evidence: `screenshots/02-5b-assistant-no-match.png` |
| Decision | **Pass** |

### 5c. Out-of-stock product is never recommended
| Field | Record |
|---|---|
| Starting state | USB-C Study Lamp (product 3) has stock 0 |
| Action and test data | Ask `I need a study lamp` |
| Expected result | The out-of-stock lamp is not recommended; the answer is honest about availability |
| Observed result and evidence | Answer: "Based on the current ShopSmart catalog, consider: Laptop Stand (₱1,200). (AI assistant unavailable — showing catalog-based results.)" Sources: "Laptop Stand (product #5)". The Study Lamp does not appear. Backend log: `[assistant] fallback reason=TIMEOUT`, request finished in ≈8.0 s. Evidence: `screenshots/02-5c-assistant-out-of-stock.png` |
| Decision | **Pass** for grounding and stock (no out-of-stock product recommended). Minor defect **D4**: the fallback suggests the Laptop Stand only because the word "study" matches its category, and does not say the lamp is unavailable. |

## Additional observations
- On page load, DevTools shows two `GET /api/products` requests (both 200). This is expected in development because the app uses React StrictMode, which runs effects twice; production builds call it once.
- The Console shows `GET /favicon.ico 404 (Not Found)`: the frontend has no favicon. Cosmetic only; no functional impact. Not fixed (low priority).


- The new order received id #9, which shows that earlier orders (#1–#8 from previous labs) are still in the database; no reseed occurred.
- Order prices come from the server: the response shows `unitPrice 650` and `total 650` taken from the database, not from the browser.

---


---

## Case 6 – Failure handling

### 6a. API server stopped (frontend running)
| Field | Record |
|---|---|
| Starting state | Frontend running with `npm run dev --workspace frontend`; backend stopped (`Ctrl + C`). One tab prepared on the checkout page with Laptop Stand × 1 |
| Action and test data | (1) Click "Place simulated order"; (2) reload the Products page; (3) ask the assistant `Which keyboard is below ₱2,000?` |
| Expected result | Each request ends and shows a useful error; no endless loading; the cart and form data are kept; no order is created |
| Observed result and evidence | (1) Checkout: "Could not reach the ShopSmart server." in the error style; header still Cart (1); form values kept; loading ended. No order was created, because the API was down and the request never reached the server. (2) Products: "Could not reach the ShopSmart server. Make sure the backend is running."; no "Loading products…" left on screen. (3) Assistant: "Could not reach the ShopSmart server."; the button returned to "Ask ShopSmart". Evidence: `screenshots/02-6a-products-api-down.png`, `screenshots/02-6a-assistant-api-down.png`. The checkout screenshot was removed because the browser had autofilled my real name, email and address into the form. That was real personal data, not fictional test data. No replacement screenshot was taken. |
| Decision | **Pass** |

### 6b. Database stopped (API running)
| Field | Record |
|---|---|
| Starting state | Backend running; PostgreSQL service stopped in `services.msc` |
| Action and test data | (1) `curl.exe -i http://localhost:3000/api/health`; (2) reload the Products page; (3) check the backend log; (4) restart PostgreSQL and check the data |
| Expected result | The health check reports that the service is not healthy; product requests fail with a controlled error and no internal details; the browser shows a useful message; after restart, data is unchanged |
| Observed result and evidence | (1) Health: **`HTTP/1.1 200 OK`, `{"status":"ok"}`**, although the database was unreachable – **Fail (D5)**. (2) Browser: "The server could not complete the request. Make sure the backend is running."; loading ended. The message is generic: the backend was running and the database was down. (3) Backend log: `GET /api/products 500` (≈4 s) with `PrismaClientInitializationError … Can't reach database server at localhost:5432`; the API response contained only `INTERNAL_ERROR`, a generic message and a `traceId` (no internal details, no credentials). (4) After restarting PostgreSQL, `GET /api/products/4` → `"stock":3`, `updatedAt 2026-11-12T14:28:44.497Z` (unchanged). Evidence: `screenshots/02-6b-health-db-down.png`, `screenshots/02-6b-browser-db-down.png`, `screenshots/02-6b-backend-log-db-down.png`, `screenshots/02-6b-recovered.png` |
| Decision | **Fail** – the failure is handled safely for users, but the health endpoint reports "ok" while the database is down (**Defect D5**) |

### 6c. AI provider failure
Observed naturally during Case 5: the provider returned HTTP 503 and later timed out after 8 s. Both requests returned 200 with catalog-based results and the note "(AI assistant unavailable — showing catalog-based results.)"; loading ended in ≈4.2 s and ≈8.0 s. Only reason codes were logged (`PROVIDER_ERROR status=503`, `TIMEOUT`). Evidence: `screenshots/02-5-backend-log.png`, `screenshots/02-5a-assistant-keyboard.png`, `screenshots/02-5c-assistant-out-of-stock.png`. **Decision: Pass.**


---

## Defect log

### D1 – Typing a multi-digit cart quantity saves the first digit (Severity: Medium, Status: Open)
| Field | Record |
|---|---|
| Starting state | Cart contains Wireless Mouse × 4 (stock 4) and Laptop Stand × 1; total ₱3,800 |
| Action | On the Cart page, select the Mouse quantity box (`Ctrl + A`) and type `10` |
| Actual result | After `1`, the quantity is saved as 1; after `0`, the value 10 is refused with "Only 4 unit(s) are available." The cart is left at Mouse × 1, total ₱1,850 |
| Expected result | The value 10 is refused and the quantity stays at 4 (total ₱3,800) |
| Impact | The customer's quantity is changed silently while the message suggests nothing changed; the customer could check out with fewer items than intended |
| Suspected cause | `frontend/src/pages/CartPage.jsx`: the quantity input calls `setQuantity(..., Number(event.target.value))` on every keystroke, so intermediate values are committed |
| Evidence | `screenshots/02-2-cart-step5.png` |

### D2 – Zero-quantity message uses the info style instead of the error style (Severity: Low, Status: Open)
| Field | Record |
|---|---|
| Starting state | Cart contains Wireless Mouse × 4 and Laptop Stand × 1 |
| Action | Select the Mouse quantity box and type `0` |
| Actual result | The quantity correctly stays at 4, but "Quantity must be a whole number greater than zero." is shown in the teal info style |
| Expected result | The validation message uses the red error style, like "Only 4 unit(s) are available." |
| Impact | Cosmetic/UX only; the invalid value is still refused |
| Suspected cause | `frontend/src/pages/CartPage.jsx`: the error style is chosen only when the message starts with "Only" |
| Evidence | `screenshots/02-2-cart-step6.png` |



### D3 – Checkout errors do not say which field is invalid (Severity: Low, Status: Open)
| Field | Record |
|---|---|
| Starting state | Checkout form with Wireless Mouse × 1 in the cart |
| Action | Submit with email `juan@test` (3a), or with an address of only spaces (3b) |
| Actual result | The page shows only "Check the customer and cart information." The API response already contains the field-level reason (`fieldErrors.email` / `fieldErrors.address`), but it is not displayed |
| Expected result | The customer is told which field to correct (for example, "Email: Invalid email address") |
| Impact | Usability only; invalid input is still correctly refused by the server |
| Suspected cause | `frontend/src/services/api.js` keeps only `error.message`; `CheckoutPage.jsx` displays that message and ignores `error.details` |
| Evidence | `screenshots/02-3a-response-details.png`, `screenshots/02-3b-response-details.png` |



### D4 – Fallback assistant recommends a product matched only by category word (Severity: Low, Status: Open)
| Field | Record |
|---|---|
| Starting state | USB-C Study Lamp stock 0; Laptop Stand (category "Study") in stock; AI provider unavailable |
| Action | Ask `I need a study lamp` |
| Actual result | The rule-based fallback recommends "Laptop Stand (₱1,200)" because the keyword "study" matches its category; it does not mention that the lamp is out of stock |
| Expected result | An honest answer that no in-stock lamp is available (optionally suggesting related items clearly as alternatives) |
| Impact | Low: the answer is grounded (real product, correct price, source shown) and the out-of-stock lamp is never recommended, but the suggestion may mislead the customer |
| Suspected cause | `backend/src/services/assistant.js` `rankProducts`: one matching keyword (including category words) is enough; only the AI path can judge that no product fits |
| Evidence | `screenshots/02-5c-assistant-out-of-stock.png` |




### D5 – Health endpoint reports "ok" while the database is down (Severity: Medium, Status: Open)
| Field | Record |
|---|---|
| Starting state | Backend running; PostgreSQL service stopped |
| Action | `curl.exe -i http://localhost:3000/api/health` |
| Actual result | `HTTP/1.1 200 OK` with `{"status":"ok"}`, while `GET /api/products` fails with 500 (`Can't reach database server at localhost:5432`) |
| Expected result | The health check reports an unhealthy state (for example 503 with `{"status":"error","database":"unreachable"}`) |
| Impact | A hosting platform or evaluator relying on `/api/health` would see a healthy service while customers cannot load products or place orders |
| Suspected cause | `backend/src/app.js`: `/api/health` returns a static response and never checks the database |
| Evidence | `screenshots/02-6b-health-db-down.png`, `screenshots/02-6b-backend-log-db-down.png` |