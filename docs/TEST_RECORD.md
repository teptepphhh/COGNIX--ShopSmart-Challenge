# Test Record: ShopSmart Grounded Product Assistant

Submitted by: Stephanie Revano (individual)
Date tested: 5 November 2026
Setup: `npm run dev` from the project root, with my real Gemini key in `backend/.env` unless the row says otherwise.
Screenshots: `docs/screenshots/ShopSmart-Screenshots-Revano.pdf` (11 pages, page 1 is the cover).

| Case | Action | Expected | Actual | Result | Screenshot (PDF page) |
|---|---|---|---|---|---|
| Baseline (before changes) | Asked "Which keyboard is below ₱2,000?" on the starter assistant. | Only relevant products. | It returned the keyboard, plus the Wireless Mouse and Laptop Stand as filler. This was my first failing case. | Fail (fixed) | p. 2 |
| 1. Catalog match | Asked "Which keyboard is below ₱2,000?" on the Assistant page. | Only the Compact Mechanical Keyboard (id 2, ₱1,850), linked, with the price from the database. | Gemini answered "We have the Compact Mechanical Keyboard available for ₱1,850, which is below your budget!" One product link and one source, both id 2, price 1850. | Pass | p. 3 |
| 2. No match | Asked "Do you sell refrigerators?" | Honest no-match, no products, no sources, Gemini not called. | "I could not find an in-stock ShopSmart product matching that request." Both lists empty. It answered in about 0.18 s with no Gemini call. | Pass | p. 4 |
| 3. Invalid input | In PowerShell: `try { Invoke-WebRequest -Uri "http://localhost:3000/api/assistant/questions" -Method POST -ContentType "application/json" -Body '{"question":"hi"}' -UseBasicParsing } catch { "Status: " + $_.Exception.Response.StatusCode.value__; $_.ErrorDetails.Message }` | HTTP 422 with `INVALID_QUESTION`. | `Status: 422` and `{"error":{"code":"INVALID_QUESTION","message":"Question must contain between 3 and 300 characters."}}` | Pass | p. 5 |
| 4. Availability | Asked "Do you have a study lamp?" The USB-C Study Lamp (id 3) has stock 0. | The lamp is never recommended. | "We do not have a study lamp available at the moment." No products. Only id 5 (Laptop Stand) was sent to Gemini. Id 3 was never sent. | Pass | p. 6 |
| 5. Provider failure | Stopped the app, ran `$env:GEMINI_API_KEY = "invalid-test-key"; npm run dev`, then asked the keyboard question. | Rule-based answer with a clear note. Loading ends. | Log: `[assistant] fallback reason=PROVIDER_ERROR status=400`. The page showed the Compact Mechanical Keyboard (₱1,850) with "(AI assistant unavailable — showing catalog-based results.)" in about 329 ms. | Pass | p. 7 |
| 6. Source check | Compared the ids in the case 1 response with the products retrieved for that question. | Every recommended id and source id is in the retrieved set. | Retrieved [2], recommended [2], sources [2]. I clicked the product link and the Sources link on the page. Both opened /products/2, which showed ₱1,850.00 and "7 unit(s) available", matching the answer. My tests also check that an invented id like 99 is dropped. | Pass | p. 8 |
| Checkout regression | Checked out the Wireless Mouse three times, 2 units each. | Each order goes through and stock goes down by 2 each time. | All three orders were placed (orders 6, 7 and 8). Stock went from 10 to 4. The screenshots show the last checkout, where stock went from 6 to 4. | Pass | pp. 9–10 |
| npm run check | Ran `npm run check` from the project root. | Lint, tests and build all pass. | Lint passed. Frontend tests 11/11, backend tests 58/58. Build passed. | Pass | p. 11 |

AI assistance: I used Claude Code, an AI coding assistant, to help write and review the code, tests and documents. I checked the changes, ran all the live tests myself, and I am responsible for this submission.

## Contribution record (individual submission)

Contribution: I designed and verified the grounded assistant. This covers retrieval, the Gemini integration, verification, fallback, and the sources list on the page. I ran all six live test cases.

Issue resolved: The lamp question once failed live with `PRICE_MISMATCH`. Gemini wrote "We only offer a Laptop Stand for ₱1,200." but did not put the Laptop Stand in `productIds`. The price was right, but the page would have shown a product with no link and no source, so my check rejected it. I reproduced it with a local script, added a prompt rule that Gemini can only name products it picks, and made the fallback note depend on the reason. I verified the fix with new tests and 8 live runs, and none of them had a mismatch.

Second issue: In the starting code, "Which keyboard is below ₱2,000?" also returned the Wireless Mouse and Laptop Stand. They had no matching keyword and only showed up because they were cheap. I changed retrieval so a product needs a score of at least 1, and now only the keyboard comes back.
