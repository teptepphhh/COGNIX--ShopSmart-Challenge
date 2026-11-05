# ShopSmart API examples

Start the application with `npm run dev`, then send these requests through Bruno or another authorized API client.

## Health check

```http
GET http://localhost:3000/api/health
```

## Product list

```http
GET http://localhost:3000/api/products
```

## One product

```http
GET http://localhost:3000/api/products/1
```

## Create a simulated order

```http
POST http://localhost:3000/api/orders
Content-Type: application/json

{
  "customerName": "Ana Reyes",
  "email": "ana@example.com",
  "address": "Angeles City, Pampanga",
  "items": [
    { "productId": 1, "quantity": 1 },
    { "productId": 2, "quantity": 1 }
  ]
}
```

The server ignores prices from the browser and reads authoritative prices from PostgreSQL.

## Ask the grounded assistant

```http
POST http://localhost:3000/api/assistant/questions
Content-Type: application/json

{
  "question": "Which keyboard is below ₱2,000?"
}
```

The server retrieves matching in-stock products, asks Google Gemini to answer from those facts only, verifies the draft, and builds `recommendedProducts` and `sources` from database rows. See `docs/DESIGN_NOTE.md`.

**Success (HTTP 200, Gemini answer verified):**

```json
{
  "answer": "We have the Compact Mechanical Keyboard available for ₱1,850, which is below your budget!",
  "recommendedProducts": [
    { "id": 2, "name": "Compact Mechanical Keyboard", "price": 1850, "category": "Accessories" }
  ],
  "sources": [
    { "type": "product", "id": 2, "name": "Compact Mechanical Keyboard" }
  ]
}
```

**Fallback (HTTP 200, Gemini unavailable: no key, timeout, rate limit or provider error):**

```json
{
  "answer": "Based on the current ShopSmart catalog, consider: Compact Mechanical Keyboard (₱1,850). (AI assistant unavailable — showing catalog-based results.)",
  "recommendedProducts": [
    { "id": 2, "name": "Compact Mechanical Keyboard", "price": 1850, "category": "Accessories" }
  ],
  "sources": [
    { "type": "product", "id": 2, "name": "Compact Mechanical Keyboard" }
  ]
}
```

If Gemini answers but its draft fails verification, the fallback note reads "(The AI draft could not be verified against the catalog — showing catalog-based results.)" instead.

Other responses: a question with no matching product returns HTTP 200 with an honest no-match answer and empty `recommendedProducts` and `sources`. A question shorter than 3 or longer than 300 characters returns HTTP 422 `INVALID_QUESTION`. More than 20 questions per minute from one client returns HTTP 429 `RATE_LIMITED`.
