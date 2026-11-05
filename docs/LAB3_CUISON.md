# PDC50 Laboratory 3 — Live Catalog Search Through the API

Student: Yoj T. Cuison · Branch: `ASC_REST_CUISON`

## Tracing the existing path (before editing)

- `frontend/src/pages/ProductsPage.jsx` renders the catalog, holds the search, category and sort state, and asks the API service for products.
- `frontend/src/services/api.js` wraps `fetch`; `api.getProducts(query)` sends `GET /api/products?search=<term>` (or no query string when the term is empty) and turns error responses into thrown errors.
- `backend/src/routes/products.js` handles `GET /api/products`, reads `request.query.search`, asks Prisma for matching active products and returns `{ products: [...] }` with prices converted to numbers.

`api.js` already sent the search term correctly, so it was not changed.

## Changes

| File | What changed | Why |
| --- | --- | --- |
| `backend/src/services/productSearch.js` (new) | `buildProductWhere(search)` trims the term and returns `{ active: true }`, or `{ active: true, OR: [name contains, description contains] }` with `mode: 'insensitive'`. | Challenge 1: one server rule matches name **or** description while keeping active-only and case-insensitive behavior. |
| `backend/src/routes/products.js` | `GET /` uses `buildProductWhere(request.query.search)`; `orderBy: { id: 'asc' }`, response shape and price conversion unchanged. | Challenge 1, without changing the JSON contract. |
| `backend/test/productSearch.test.js` (new) | Tests the empty-term and name-or-description filters. | Proves the search rule in `npm run check`. |
| `frontend/src/pages/ProductsPage.jsx` | `useEffect` now depends on the trimmed search term and calls `api.getProducts(query)` after a 300 ms pause (immediately when cleared). An `active` flag plus `clearTimeout` in the cleanup ignores responses from older searches. Loading, empty ("No products match "webcam" in Study.") and error messages are shown. The old in-browser name/description filter was removed. | Challenge 2: the server does the search and the page always shows the latest request's result. |
| `frontend/src/pages/ProductsPage.jsx` | Categories are kept in their own `categories` state that only grows from API results, instead of being derived from the current `products`. Category filter and Lab 2 sort are applied to the current server results. | Challenge 3: the category dropdown stays complete and usable while search results shrink. |

## Explanation

When the shopper types in the search box, React waits briefly and then calls `api.getProducts(query)`, which sends `GET /api/products?search=...` to the Express API; the browser never talks to PostgreSQL directly. The route passes the trimmed term to `buildProductWhere`, and Prisma asks PostgreSQL for products that are active and whose name or description contains the term, ignoring letter case, ordered by id. Express returns that list as JSON with numeric prices, and React stores it in `products` state. Each search runs inside a `useEffect` keyed on the search term, and its cleanup marks the earlier request inactive and cancels its timer, so a slow older response can never replace the results for the newest term. While a request is in flight the page shows a loading message, an empty array shows a "No products match" message, and a failed request shows an error asking the shopper to check the backend. Category choices are stored in separate state that collects categories from every API response and never shrinks, so Study stays selected and the dropdown stays usable even when a search returns nothing. The selected category and sort order are then applied to the current server results before the cards render.

## Checks to run

API (backend running):

1. `http://localhost:3000/api/products?search=keyboard` → Compact Mechanical Keyboard (name match)
2. `http://localhost:3000/api/products?search=privacy` → 1080p Webcam (description match)
3. `http://localhost:3000/api/products?search=notfoundword` → `{ "products": [] }`
4. `http://localhost:3000/api/products` → full active catalog (6 products)

Browser (`http://localhost:5173`, Network panel open):

1. Search `privacy` → webcam appears; request `/api/products?search=privacy` shows in Network.
2. Search `keyboard` → keyboard appears.
3. Select Study, search `lamp` → USB-C Study Lamp.
4. Select Study, search `webcam` → no-match message; Study still selected; dropdown still lists every category.
5. Clear search, choose All, sort by price → full catalog in price order.
6. Search `privacy`, then clear quickly → full catalog, no stale webcam-only list.
7. Server failure: stop `npm run dev`, run `npm run dev --workspace frontend`, search → error message. Restart `npm run dev`, then change the search or reload → catalog recovers.

Full check: `npm run check` (lint, 4 frontend + 8 backend tests, build) passes.

Screenshots of every check are in `docs/lab3_screenshots/`.
