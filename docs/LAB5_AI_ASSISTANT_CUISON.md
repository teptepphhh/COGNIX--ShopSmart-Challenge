# PDC50 Laboratory 5 — Grounded Product Assistant

Student: Yoj T. Cuison · Branch: `ASC_AI_ASSISTANT_SHOPSMART_CUISON` (from `ASC_REST_CUISON`)

## Request flow

```
AssistantPage.jsx (form)  →  api.askAssistant()  →  POST /api/assistant/questions
  →  routes/assistant.js: zod validation (3–300 chars, else 422) + rate limit
  →  Prisma: active products, public fields only
  →  services/assistant.js answerQuestion()
       1. catalogRetrieval.selectCatalogFacts()   picks ≤3 eligible products (active, stock > 0, within budget, matching terms)
       2. no eligible product → honest no-match answer, provider NOT called
       3. aiProvider (Gemini REST) drafts a JSON answer from the selected facts only
       4. answerVerifier.verifyDraft() checks ids, prices, stock and extra claims
       5. failure or rejected draft → rule-based answer from the same facts + notice
  →  { answer, recommendedProducts, sources, mode, notice?, verification }
  →  AssistantPage shows mode, notice, answer, product links and sources
```

## Baseline problems found before editing

- "Do you sell running shoes?" recommended a mouse, lamp and laptop stand (`01_baseline_starter_api.png`), because ranking kept every in-stock product even with a score of 0.
- "Which keyboard is below ₱2,000?" also listed the mouse and lamp (`00_baseline_starter_assistant.png`).
- A model number such as "1080p" would have been read as a ₱1,080 budget.

## Changes

| File | What changed | Why |
| --- | --- | --- |
| `backend/src/services/catalogRetrieval.js` (new) | Term extraction with stopwords and plurals, budget parsing only for money or limit words, Decimal→number price conversion, `selectCatalogFacts` returning ≤3 facts plus out-of-stock and over-budget matches. | Retrieve a relevant catalog subset; never recommend unrelated, inactive or out-of-stock products. |
| `backend/src/services/aiProvider.js` (new) | Gemini `generateContent` over HTTPS with JSON response schema, key in the `x-goog-api-key` header, 8 s timeout, errors classified as timeout / rate limit / unavailable / auth / invalid format. | Server-side AI draft; the key never reaches the browser, URLs, responses or logs. |
| `backend/src/services/answerVerifier.js` (new) | Rejects unknown product ids, peso amounts that are not a selected price or the customer's budget, wrong stock counts, "sold out" claims, discounts/shipping/warranty claims and other catalog products not selected. | The AI response is only a draft. |
| `backend/src/services/assistant.js` | `answerQuestion()` orchestrates retrieval → draft → verify → fallback. `buildAssistantResponse()` keeps the rule answer and now gives an honest no-match. | Keep a useful rule-based fallback. |
| `backend/src/routes/assistant.js` | Same endpoint, validation and rate limit; selects only public product fields; calls `answerQuestion()`. | Keep the established contract. |
| `backend/.env.example` | Added `AI_PROVIDER`, `GEMINI_API_KEY` (empty), `GEMINI_MODEL`, `GEMINI_TIMEOUT_MS`. | Shows where the server-only key goes. |
| `backend/test/assistant.test.js`, `backend/test/aiProvider.test.js` | 3 starter tests kept, 18 new tests (retrieval, no match, stock 0, invented id, wrong price, provider failures, key handling). | Proves the behaviour in `npm run check`. |
| `frontend/src/pages/AssistantPage.jsx` | Waiting message, mode badge, fallback notice, product links with price and stock, visible Sources list, readable server-unreachable error. | Clear answer and source display. |
| `frontend/src/services/api.js` | Optional request timeout (20 s for the assistant). | No endless loading. |
| `frontend/src/styles.css` | Styles for the badge, warning notice and sources. | Display. |
| `frontend/src/pages/ProductsPage.jsx` | Restored `emptyMessage`, which the Lab 3 merge removed. | `npm run check` failed (`no-undef`) and a no-result search would crash the page. |

## Setup for the AI provider (on your own PC)

1. Get a free Gemini API key from Google AI Studio.
2. Add it to `backend/.env` only: `GEMINI_API_KEY=your_key`. Optionally set `GEMINI_MODEL` to a model listed for your key.
3. Restart `npm run dev`. Successful drafts show the badge "AI draft · checked against the catalog".

Without a key the assistant still works with catalog rules and says so.

## Provider failure test configuration

- Unavailable: `GEMINI_API_KEY=test-key` and `GEMINI_BASE_URL=http://127.0.0.1:9` (nothing listens there).
- Timeout: point `GEMINI_BASE_URL` to a server that never replies and set `GEMINI_TIMEOUT_MS=4000`.

Remove these lines afterwards.

## Evidence

Screenshots are in `docs/ai_assistant_screenshots/` (00–25). `npm run check` passes: frontend lint, backend lint, 11 frontend and 27 backend tests, and the production build.
