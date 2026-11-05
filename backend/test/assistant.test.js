import test from 'node:test';
import assert from 'node:assert/strict';
import { answerQuestion, buildAssistantResponse, parseBudget, rankProducts } from '../src/services/assistant.js';
import { selectCatalogFacts } from '../src/services/catalogRetrieval.js';
import { ProviderError } from '../src/services/aiProvider.js';

const products = [
  { id: 1, name: 'Keyboard', category: 'Accessories', description: 'Mechanical keyboard', price: 1800, stock: 2 },
  { id: 2, name: 'Mouse', category: 'Accessories', description: 'Wireless mouse', price: 600, stock: 3 }
];

// Same shape as the seeded catalog (prices as Decimal-like strings, as Prisma returns them).
const catalog = [
  { id: 1, name: 'Wireless Mouse', description: 'Quiet wireless mouse with adjustable sensitivity and USB receiver.', category: 'Accessories', price: '650.00', stock: 12, active: true },
  { id: 2, name: 'Compact Mechanical Keyboard', description: 'Hot-swappable compact keyboard with tactile switches.', category: 'Accessories', price: '1850.00', stock: 8, active: true },
  { id: 3, name: 'USB-C Study Lamp', description: 'Adjustable desk lamp with three brightness levels.', category: 'Study', price: '900.00', stock: 10, active: true },
  { id: 4, name: '1080p Webcam', description: 'Full HD webcam with privacy cover and built-in microphone.', category: 'Video', price: '1450.00', stock: 6, active: true },
  { id: 6, name: 'USB Headset', description: 'Over-ear headset with noise-reducing boom microphone.', category: 'Audio', price: '1350.00', stock: 7, active: true }
];
const silent = { warn: () => {} };
const provider = (impl) => ({ name: 'fake', draftAnswer: impl });

// Starter tests (kept)
test('parseBudget extracts a peso budget', () => assert.equal(parseBudget('below ₱2,000'), 2000));
test('rankProducts respects the budget', () => assert.deepEqual(rankProducts(products, 'mouse below 700').map((p) => p.id), [2]));
test('assistant response contains traceable sources', () => assert.equal(buildAssistantResponse(products, 'keyboard').sources[0].id, 1));

// Retrieval
test('parseBudget ignores model numbers such as 1080p', () => assert.equal(parseBudget('Do you have a 1080p webcam?'), null));
test('parseBudget reads "under 1.5k" and "1500 pesos"', () => {
  assert.equal(parseBudget('lamp under 1.5k'), 1500);
  assert.equal(parseBudget('headset for 1500 pesos'), 1500);
});
test('keyboard below ₱2,000 selects only the keyboard with a numeric price', () => {
  const { facts, budget } = selectCatalogFacts(catalog, 'Which keyboard is below ₱2,000?');
  assert.equal(budget, 2000);
  assert.deepEqual(facts, [{ id: 2, name: 'Compact Mechanical Keyboard', description: 'Hot-swappable compact keyboard with tactile switches.', category: 'Accessories', price: 1850, stock: 8 }]);
});
test('only public product fields are selected for the provider', () => {
  const { facts } = selectCatalogFacts([{ ...catalog[1], emoji: 'x', createdAt: new Date(), secret: 'no' }], 'keyboard');
  assert.deepEqual(Object.keys(facts[0]).sort(), ['category', 'description', 'id', 'name', 'price', 'stock']);
});
test('a category absent from the catalog gives no match and no sources', () => {
  const response = buildAssistantResponse(catalog, 'Do you sell running shoes?');
  assert.equal(response.mode, 'no_match');
  assert.deepEqual(response.recommendedProducts, []);
  assert.deepEqual(response.sources, []);
});
test('an out-of-stock product is never recommended as available', () => {
  const withSoldOut = [...catalog, { id: 9, name: 'Test Drawing Tablet', description: 'Disposable test product.', category: 'Test', price: '999.00', stock: 0, active: true }];
  const response = buildAssistantResponse(withSoldOut, 'drawing tablet');
  assert.equal(response.mode, 'no_match');
  assert.deepEqual(response.recommendedProducts, []);
  assert.match(response.answer, /out of stock/);
});

// Orchestration
test('no match does not call the provider', async () => {
  let called = false;
  const response = await answerQuestion({ products: catalog, question: 'running shoes', provider: provider(async () => { called = true; }), logger: silent });
  assert.equal(called, false);
  assert.equal(response.mode, 'no_match');
});
test('a verified AI draft is returned with sources from the selected facts', async () => {
  let sentFacts;
  const response = await answerQuestion({
    products: catalog, question: 'Which keyboard is below ₱2,000?', logger: silent,
    provider: provider(async (_question, facts) => { sentFacts = facts; return { answer: 'The Compact Mechanical Keyboard costs ₱1,850, within your ₱2,000 budget.', productIds: [2] }; })
  });
  assert.deepEqual(sentFacts.map((fact) => fact.id), [2]);
  assert.equal(response.mode, 'ai');
  assert.deepEqual(response.recommendedProducts.map((p) => [p.id, p.price]), [[2, 1850]]);
  assert.deepEqual(response.sources.map((s) => s.id), [2]);
});
test('an invented product id is rejected and replaced by the rule answer', async () => {
  const response = await answerQuestion({ products: catalog, question: 'keyboard', logger: silent, provider: provider(async () => ({ answer: 'Try the Gaming Keyboard X.', productIds: [99] })) });
  assert.equal(response.mode, 'rules');
  assert.equal(response.fallbackReason, 'VERIFICATION_FAILED');
  assert.ok(response.verification.issues.includes('UNKNOWN_PRODUCT_ID'));
  assert.ok(response.sources.every((source) => source.id === 2));
});
test('a wrong price claim is rejected', async () => {
  const response = await answerQuestion({ products: catalog, question: 'keyboard', logger: silent, provider: provider(async () => ({ answer: 'The keyboard is only ₱1,500 today!', productIds: [2] })) });
  assert.ok(response.verification.issues.includes('UNSUPPORTED_PRICE'));
  assert.match(response.answer, /₱1,850/);
});
test('provider failures end in a rule-based fallback with a notice', async () => {
  for (const code of ['PROVIDER_TIMEOUT', 'PROVIDER_RATE_LIMITED', 'PROVIDER_UNAVAILABLE', 'PROVIDER_INVALID_FORMAT']) {
    const response = await answerQuestion({ products: catalog, question: 'keyboard', logger: silent, provider: provider(async () => { throw new ProviderError(code, 'x'); }) });
    assert.equal(response.mode, 'rules');
    assert.equal(response.fallbackReason, code);
    assert.ok(response.notice.length > 10);
    assert.deepEqual(response.recommendedProducts.map((p) => p.id), [2]);
  }
});
test('without a configured provider the rules still answer', async () => {
  const response = await answerQuestion({ products: catalog, question: 'microphone', provider: null, logger: silent });
  assert.equal(response.mode, 'rules');
  assert.deepEqual(response.recommendedProducts.map((p) => p.id).sort(), [4, 6]);
});
