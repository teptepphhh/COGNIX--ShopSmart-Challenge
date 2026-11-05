import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAssistantResponse, extractKeywords, parseBudget, rankProducts, retrieveProducts } from '../src/services/assistant.js';
import { CATALOG } from './fixtures/catalog.js';

const products = [
  { id: 1, name: 'Keyboard', category: 'Accessories', description: 'Mechanical keyboard', price: 1800, stock: 2 },
  { id: 2, name: 'Mouse', category: 'Accessories', description: 'Wireless mouse', price: 600, stock: 3 }
];

test('parseBudget extracts a peso budget', () => assert.equal(parseBudget('below ₱2,000'), 2000));
test('rankProducts respects the budget', () => assert.deepEqual(rankProducts(products, 'mouse below 700').map((p) => p.id), [2]));
test('assistant response contains traceable sources', () => assert.equal(buildAssistantResponse(products, 'keyboard').sources[0].id, 1));

// ---- Grounded assistant retrieval (Week 5) ----

const ids = (list) => list.map((product) => product.id);

test('retrieval: the keyboard question returns only the in-budget keyboard, with no score-0 filler', () => {
  assert.deepEqual(ids(retrieveProducts(CATALOG, 'Which keyboard is below ₱2,000?')), [2]);
});

test('retrieval: "2,000" parses to 2000 and does not create a "000" keyword', () => {
  assert.equal(parseBudget('Which keyboard is below ₱2,000?'), 2000);
  assert.deepEqual(extractKeywords('Which keyboard is below ₱2,000?'), ['keyboard']);
});

test('retrieval: "1080p webcam" has no budget and still finds the webcam', () => {
  assert.equal(parseBudget('1080p webcam'), null);
  assert.deepEqual(ids(retrieveProducts(CATALOG, '1080p webcam')), [4]);
});

test('retrieval: a number is only a budget with a cue word or currency', () => {
  assert.equal(parseBudget('headset under 1500'), 1500);
  assert.equal(parseBudget('my budget: 1,200'), 1200);
  assert.equal(parseBudget('up to php 900'), 900);
  assert.equal(parseBudget('laptop stand for 16 inches'), null);
  assert.equal(parseBudget('above ₱1,000'), null);
});

test('retrieval: stock-0 and inactive products are never retrieved', () => {
  assert.deepEqual(ids(retrieveProducts(CATALOG, 'study lamp')), [5]);
  assert.ok(!ids(retrieveProducts(CATALOG, 'gaming keyboard')).includes(7));
  assert.ok(!ids(retrieveProducts(CATALOG, 'anything under ₱5,000')).some((id) => id === 3 || id === 7));
});

test('retrieval: unrelated or empty questions match nothing, budget-only questions match by price', () => {
  assert.deepEqual(retrieveProducts(CATALOG, 'Do you sell refrigerators?'), []);
  assert.deepEqual(retrieveProducts(CATALOG, 'hello there'), []);
  assert.deepEqual(ids(retrieveProducts(CATALOG, 'anything under 1000 pesos?')), [1]);
});

test('rule-based response lists DB prices and adds a note only when one is given', () => {
  const response = buildAssistantResponse(CATALOG, 'keyboard');
  assert.match(response.answer, /Compact Mechanical Keyboard \(₱1,850\)/);
  assert.ok(!response.answer.includes('AI assistant unavailable'));
  assert.match(buildAssistantResponse(CATALOG, 'keyboard', { note: '(note)' }).answer, /\(note\)$/);
  assert.deepEqual(response.recommendedProducts, [{ id: 2, name: 'Compact Mechanical Keyboard', price: 1850, category: 'Accessories' }]);
});
