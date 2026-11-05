# Design Note: ShopSmart Grounded Product Assistant

Submitted by: Stephanie Revano (individual)
Lab: PDC50 Week 5, Grounded Product Assistant (Google Gemini)

## Flow

```
AssistantPage.jsx → POST /api/assistant/questions → Zod check (422), rate limit (429)
  → Prisma: active products with stock > 0
  → retrieveProducts(): no match? "could not find" answer, Gemini not called
  → gemini.js: ask Gemini → assistantOrchestrator.js: verify, or fall back to rules
  → { answer, recommendedProducts, sources } built from database rows
```

Picture version: [request-flow.png](request-flow.png)

The endpoint and response shape did not change. The server finds products first, then asks Gemini.

## Retrieval

I only load active products with stock above 0. I match the question's keywords against name, category and description. A number is a budget only after "below", "under" or a peso sign, so "1080p" is not one. A product needs at least one match, and I send at most 5.

## Provider

Only `services/gemini.js` calls Gemini (`gemini-3.5-flash-lite`). The key stays in `backend/.env` on the server. Gemini must reply in JSON with `answer` and `productIds`. I wait at most 8 seconds, with no retries.

## Verification

I check the JSON with Zod and drop any id I did not retrieve. Every peso amount in the answer must match the price of a product Gemini picked. The answer cannot call a picked product out of stock. Names, prices and sources on the page come from my database rows.

## Fallback

- No match: "I could not find an in-stock ShopSmart product matching that request." No products, no Gemini call.
- Provider timeout: my rule-based product list with "(AI assistant unavailable — showing catalog-based results.)"
- Malformed output: the same list with "(The AI draft could not be verified against the catalog — showing catalog-based results.)"
- Rate limit: a Gemini 429 shows the "unavailable" note. Over 20 questions a minute gets my own 429: "Too many assistant questions. Please wait a minute and try again."

## Evidence

My first failing case was the baseline. "Which keyboard is below ₱2,000?" also returned the Wireless Mouse and Laptop Stand, just because they were cheap. I fixed it by requiring a score of at least 1. Live, the lamp question once failed with `PRICE_MISMATCH` because Gemini priced the Laptop Stand without picking it. A new prompt rule fixed it, and 8 live runs had no mismatch. See `TEST_RECORD.md`.

## Design questions

1. I send `id`, `name`, `category`, `description`, `price` and `stock`. That covers what the product is, what it costs and if it is available, and none of it is private.
2. Gemini can only pick from the ids I retrieved, and I drop any other id. I build `recommendedProducts` and `sources` from my own database rows, so a made-up product or source cannot show up.
3. I return the "could not find" message with empty lists. I don't call Gemini, because it would have no facts to use and could only waste quota or make something up.
4. I return my rule-based answer with the "unavailable" note, still HTTP 200. The rules can still find products by keyword and budget and show their names, prices and links.
5. Earlier labs did not add user accounts, so there is no login. All catalog data is already public through `GET /api/products`, and the assistant route is public with only the rate limit. If accounts are added later, permissions belong in the Express routes on the server, and Gemini should still get only public catalog fields.

Known limitations (Gemini 503s and timeouts, out-of-stock wording, no login) are listed in DESIGN_NOTE_DETAILS.md.

Full details: DESIGN_NOTE_DETAILS.md
