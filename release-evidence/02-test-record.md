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
| Observed result and evidence | No product cards; message "No products match your filters." shown. Request `GET /api/products?search=webcam` → 200 OK, Content-Length 269 (the API returns the webcam; the client-side "Study" filter correctly hides it). Category list still shows All, Accessories, Study, Video, Audio. Evidence: `screenshots/02-1c-category-search.png`, `screenshots/02-1c-category-options.png` |
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

## Additional observations
- On page load, DevTools shows two `GET /api/products` requests (both 200). This is expected in development because the app uses React StrictMode, which runs effects twice; production builds call it once.
- The Console shows `GET /favicon.ico 404 (Not Found)`: the frontend has no favicon. Cosmetic only; no functional impact. Not fixed (low priority).


- The new order received id #9, which shows that earlier orders (#1–#8 from previous labs) are still in the database; no reseed occurred.
- Order prices come from the server: the response shows `unitPrice 650` and `total 650` taken from the database, not from the browser.

---


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