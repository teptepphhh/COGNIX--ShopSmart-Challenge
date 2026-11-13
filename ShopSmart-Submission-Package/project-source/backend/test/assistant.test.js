import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAssistantResponse,
  createAssistantResponse,
  parseBudget,
  rankProducts,
  requestGeminiDraft
} from '../src/services/assistant.js';

const products = [
  { id: 1, name: 'Compact Mechanical Keyboard', category: 'Accessories', description: 'Mechanical keyboard', price: 1850, stock: 2 },
  { id: 2, name: 'Wireless Mouse', category: 'Accessories', description: 'Wireless mouse', price: 600, stock: 3 }
];

test('parseBudget extracts a peso budget', () => assert.equal(parseBudget('below ₱2,000'), 2000));
test('parseBudget supports currency-free and decimal budgets', () => {
  assert.equal(parseBudget('mouse below 700'), 700);
  assert.equal(parseBudget('under PHP 2,000.50'), 2000.5);
});
test('parseBudget does not mistake an unrelated phone number for a budget', () => {
  assert.equal(parseBudget('my phone is 0912345678; show me a keyboard'), null);
});
test('rankProducts respects the budget and matches the requested item', () => {
  assert.deepEqual(rankProducts(products, 'mouse below 700').map((product) => product.id), [2]);
});
test('unrelated requests do not receive arbitrary recommendations', () => {
  assert.deepEqual(rankProducts(products, 'show me a refrigerator'), []);
});
test('inactive and out-of-stock products are never recommended', () => {
  const unavailable = [
    { ...products[0], stock: 0 },
    { ...products[1], active: false }
  ];
  assert.deepEqual(rankProducts(unavailable, 'keyboard mouse'), []);
});
test('rule-based fallback contains matching product and traceable source', () => {
  const result = buildAssistantResponse(products, 'keyboard below ₱2,000');
  assert.match(result.answer, /Compact Mechanical Keyboard/);
  assert.deepEqual(result.recommendedProducts.map((product) => product.id), [1]);
  assert.deepEqual(result.sources.map((source) => source.id), [1]);
});
test('a provider draft is used only when its answer is grounded and its ids are selected', async () => {
  const result = await createAssistantResponse(products, 'keyboard below ₱2,000', {
    apiKey: 'test-key',
    generateDraft: async () => ({
      answer: 'The Compact Mechanical Keyboard is listed at ₱1,850 and is in stock.',
      productIds: [1]
    })
  });
  assert.equal(result.answerMode, 'ai');
  assert.deepEqual(result.sources.map((source) => source.id), [1]);
});
test('Gemini receives the sanitized question, selected facts, and the JSON response schema', async () => {
  let request;
  const draft = await requestGeminiDraft(
    'Email john@example.com or call 0912 345 6789: which keyboard is below ₱2,000?',
    [products[0]],
    'test-key',
    async (url, options) => {
      request = { url, ...options, body: JSON.parse(options.body) };
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify({
            answer: 'The Compact Mechanical Keyboard is listed at ₱1,850.',
            productIds: [1]
          }) }] } }]
        })
      };
    }
  );
  const prompt = request.body.contents[0].parts[0].text;
  assert.match(request.url, /models\/gemini-3\.8-flash:generateContent$/);
  assert.equal(request.headers['x-goog-api-key'], 'test-key');
  assert.equal(prompt.includes('john@example.com'), false);
  assert.equal(prompt.includes('0912 345 6789'), false);
  assert.match(prompt, /which keyboard is below ₱2,000\?/);
  assert.match(prompt, /Compact Mechanical Keyboard/);
  assert.equal(request.body.generationConfig.responseMimeType, 'application/json');
  assert.deepEqual(request.body.generationConfig.responseJsonSchema.required, ['answer', 'productIds']);
  assert.deepEqual(draft.productIds, [1]);
});
test('unsupported prices or specifications fall back to verified catalog facts', async () => {
  const result = await createAssistantResponse(products, 'keyboard below ₱2,000', {
    apiKey: 'test-key',
    generateDraft: async () => ({
      answer: 'The Compact Mechanical Keyboard has RGB lighting and costs ₱999.',
      productIds: [1]
    })
  });
  assert.equal(result.answerMode, 'fallback');
  assert.match(result.answer, /₱1,850/);
});
test('a budget amount cannot be presented as a product price', async () => {
  const result = await createAssistantResponse(products, 'keyboard below ₱2,000', {
    apiKey: 'test-key',
    generateDraft: async () => ({
      answer: 'The Compact Mechanical Keyboard is listed at ₱2,000.',
      productIds: [1]
    })
  });
  assert.equal(result.answerMode, 'fallback');
});
test('invented product IDs are rejected from model drafts', async () => {
  const result = await createAssistantResponse(products, 'keyboard below ₱2,000', {
    apiKey: 'test-key',
    generateDraft: async () => ({
      answer: 'The Compact Mechanical Keyboard is available.',
      productIds: [999]
    })
  });
  assert.equal(result.answerMode, 'fallback');
  assert.deepEqual(result.sources.map((source) => source.id), [1]);
});
test('provider failures produce a useful catalog fallback', async () => {
  const result = await createAssistantResponse(products, 'keyboard below ₱2,000', {
    apiKey: 'test-key',
    generateDraft: async () => { throw new Error('provider unavailable'); }
  });
  assert.equal(result.answerMode, 'fallback');
  assert.match(result.answer, /Compact Mechanical Keyboard/);
});
test('the provider is not called when there is no catalog match', async () => {
  let called = false;
  const result = await createAssistantResponse(products, 'refrigerator', {
    apiKey: 'test-key',
    generateDraft: async () => { called = true; }
  });
  assert.equal(called, false);
  assert.equal(result.answerMode, 'no_match');
  assert.deepEqual(result.recommendedProducts, []);
  assert.deepEqual(result.sources, []);
});

test('natural phrasing using catalog description words is accepted', async () => {
  const result = await createAssistantResponse(products, 'keyboard below ₱2,000', {
    apiKey: 'test-key',
    generateDraft: async () => ({
      answer: 'The Compact Mechanical Keyboard fits your budget at ₱1,850 and has 2 units in stock. It is a great mechanical keyboard choice.',
      productIds: [1]
    })
  });
  assert.equal(result.answerMode, 'ai');
});

test('a stock count that does not match the catalog is rejected', async () => {
  const result = await createAssistantResponse(products, 'keyboard below ₱2,000', {
    apiKey: 'test-key',
    generateDraft: async () => ({
      answer: 'The Compact Mechanical Keyboard has 50 units in stock.',
      productIds: [1]
    })
  });
  assert.equal(result.answerMode, 'fallback');
});
