// The six handout test cases, plus verification and fallback paths.
// A fake provider stands in for Gemini, so these tests make no network calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '@google/genai';
import {
  AI_UNAVAILABLE_NOTE, AI_UNVERIFIED_NOTE, answerQuestion, extractMentionedAmounts, fallbackNoteFor
} from '../src/services/assistantOrchestrator.js';
import { createGeminiProvider } from '../src/services/gemini.js';
import { assistantQuestionSchema } from '../src/validators/schemas.js';
import { CATALOG } from './fixtures/catalog.js';

const KEYBOARD_QUESTION = 'Which keyboard is below ₱2,000?';

function fakeProvider(respond) {
  const calls = [];
  return {
    calls,
    async generate(input) {
      calls.push(input);
      return respond(input);
    }
  };
}

function recordingLogger() {
  const messages = [];
  return { messages, warn: (message) => messages.push(message) };
}

const ask = (question, provider, logger = recordingLogger()) =>
  answerQuestion({ question, products: CATALOG, provider, logger });

const responseIds = (response) => ({
  recommended: response.recommendedProducts.map((product) => product.id),
  sources: response.sources.map((source) => source.id)
});

const UNAVAILABLE = new Set(['NO_KEY', 'TIMEOUT', 'RATE_LIMITED', 'PROVIDER_ERROR']);
const hasFallbackNote = (answer) => answer.includes(AI_UNAVAILABLE_NOTE) || answer.includes(AI_UNVERIFIED_NOTE);

// Provider problems say "unavailable"; drafts that fail a check say "could not be verified".
function assertFallback(response, logger, reason) {
  const expectedNote = UNAVAILABLE.has(reason) ? AI_UNAVAILABLE_NOTE : AI_UNVERIFIED_NOTE;
  assert.ok(response.answer.endsWith(expectedNote), `expected note "${expectedNote}" in: ${response.answer}`);
  assert.deepEqual(Object.keys(response).sort(), ['answer', 'recommendedProducts', 'sources']);
  assert.ok(logger.messages.some((message) => message.includes(`reason=${reason}`)), `expected reason ${reason}, got ${logger.messages}`);
}

// ---- Handout case 1: catalog match ----
test('case 1: the keyboard question returns only the keyboard, with the DB price and a source', async () => {
  const provider = fakeProvider(() => ({ answer: 'The Compact Mechanical Keyboard is ₱1,850, within your ₱2,000 budget.', productIds: [2] }));
  const response = await ask(KEYBOARD_QUESTION, provider);

  assert.deepEqual(provider.calls[0].products.map((product) => product.id), [2], 'only retrieved products are sent to the provider');
  assert.deepEqual(response.recommendedProducts, [{ id: 2, name: 'Compact Mechanical Keyboard', price: 1850, category: 'Accessories' }]);
  assert.deepEqual(response.sources, [{ type: 'product', id: 2, name: 'Compact Mechanical Keyboard' }]);
  assert.ok(!hasFallbackNote(response.answer));
});

// ---- Handout case 2: no match ----
test('case 2: a product category that does not exist gives an honest no-match and never calls the provider', async () => {
  const provider = fakeProvider(() => assert.fail('provider must not be called'));
  const response = await ask('Do you sell refrigerators?', provider);

  assert.equal(provider.calls.length, 0);
  assert.match(response.answer, /could not find/i);
  assert.deepEqual(response.recommendedProducts, []);
  assert.deepEqual(response.sources, []);
});

// ---- Handout case 3: invalid input ----
test('case 3: a question shorter than 3 characters fails validation', () => {
  assert.equal(assistantQuestionSchema.safeParse({ question: 'hi' }).success, false);
  assert.equal(assistantQuestionSchema.safeParse({ question: '   ab  ' }).success, false);
  assert.equal(assistantQuestionSchema.safeParse({ question: 'lamp' }).success, true);
});

// ---- Handout case 4: availability ----
test('case 4: a stock-0 product is never sent to the provider or recommended, even if the AI names it', async () => {
  const provider = fakeProvider(() => ({ answer: 'Try the USB-C Study Lamp.', productIds: [3] }));
  const logger = recordingLogger();
  const response = await ask('Do you have a study lamp?', provider, logger);

  assert.ok(!provider.calls[0].products.some((product) => product.id === 3), 'the lamp is not retrieved');
  const { recommended, sources } = responseIds(response);
  assert.ok(!recommended.includes(3) && !sources.includes(3));
  assertFallback(response, logger, 'UNGROUNDED');
});

test('case 4: when the AI says nothing fits, the honest answer is returned with no products or sources', async () => {
  const provider = fakeProvider(() => ({ answer: 'Sorry, we do not have a study lamp available at the moment.', productIds: [] }));
  const response = await ask('Do you have a study lamp?', provider);
  assert.deepEqual(response, { answer: 'Sorry, we do not have a study lamp available at the moment.', recommendedProducts: [], sources: [] });
});

test('case 4: an empty selection that still mentions a price falls back', async () => {
  const logger = recordingLogger();
  const provider = fakeProvider(() => ({ answer: 'No lamp, but lamps usually cost ₱900.', productIds: [] }));
  assertFallback(await ask('Do you have a study lamp?', provider, logger), logger, 'PRICE_MISMATCH');
});

test('case 4: the AI may not call a selected in-stock product unavailable', async () => {
  const provider = fakeProvider(() => ({ answer: 'Sorry, the Compact Mechanical Keyboard is out of stock.', productIds: [2] }));
  const logger = recordingLogger();
  assertFallback(await ask(KEYBOARD_QUESTION, provider, logger), logger, 'AVAILABILITY_MISMATCH');
});

test('case 4: the AI may say an unlisted product is unavailable while recommending an in-stock one', async () => {
  const provider = fakeProvider(() => ({ answer: 'We have no study lamp in stock right now. The Laptop Stand (₱1,200) is our other Study product.', productIds: [5] }));
  const response = await ask('Do you have a study lamp?', provider);
  assert.deepEqual(responseIds(response).recommended, [5]);
  assert.ok(!hasFallbackNote(response.answer));
});

// ---- Handout case 5: provider failure ----
const failures = [
  ['TIMEOUT', () => Object.assign(new Error('timed out'), { code: 'TIMEOUT' })],
  ['RATE_LIMITED', () => Object.assign(new Error('quota'), { code: 'RATE_LIMITED', status: 429 })],
  ['PROVIDER_ERROR', () => Object.assign(new Error('server'), { code: 'PROVIDER_ERROR', status: 500 })],
  ['PROVIDER_ERROR', () => new TypeError('fetch failed')]
];
for (const [reason, makeError] of failures) {
  test(`case 5: provider failure (${reason}) falls back to catalog results with a note`, async () => {
    const logger = recordingLogger();
    const response = await ask(KEYBOARD_QUESTION, fakeProvider(() => { throw makeError(); }), logger);
    assertFallback(response, logger, reason);
    assert.deepEqual(responseIds(response).recommended, [2]);
  });
}

test('case 5: no API key falls back without calling anything', async () => {
  const logger = recordingLogger();
  const response = await ask(KEYBOARD_QUESTION, createGeminiProvider({ apiKey: '' }), logger);
  assertFallback(response, logger, 'NO_KEY');
});

test('case 5: a real Gemini provider that never answers times out and falls back', async () => {
  const hangingClient = { models: { generateContent: () => new Promise(() => {}) } };
  const provider = createGeminiProvider({ apiKey: 'test-key', model: 'test-model', timeoutMs: 25, client: hangingClient });
  const logger = recordingLogger();
  const started = Date.now();
  const response = await ask(KEYBOARD_QUESTION, provider, logger);
  assert.ok(Date.now() - started < 1000, 'loading must end promptly');
  assertFallback(response, logger, 'TIMEOUT');
});

test('case 5: a Gemini 429 through the real provider is reported as RATE_LIMITED', async () => {
  const client = { models: { generateContent: async () => { throw new ApiError({ message: 'RESOURCE_EXHAUSTED', status: 429 }); } } };
  const logger = recordingLogger();
  const response = await ask(KEYBOARD_QUESTION, createGeminiProvider({ apiKey: 'test-key', model: 'm', client }), logger);
  assertFallback(response, logger, 'RATE_LIMITED');
});

for (const [label, output] of [
  ['answer missing', { productIds: [2] }],
  ['productIds not integers', { answer: 'Keyboard', productIds: ['2'] }],
  ['too many productIds', { answer: 'All of them', productIds: [1, 2, 4, 5] }],
  ['empty answer', { answer: '   ', productIds: [2] }],
  ['not an object', 'Compact Mechanical Keyboard']
]) {
  test(`case 5: an invalid AI response (${label}) falls back`, async () => {
    const logger = recordingLogger();
    assertFallback(await ask(KEYBOARD_QUESTION, fakeProvider(() => output), logger), logger, 'INVALID_RESPONSE');
  });
}

test('case 5: invalid JSON from Gemini falls back', async () => {
  const client = { models: { generateContent: async () => ({ text: '{"answer": "Keyboard", ' }) } };
  const logger = recordingLogger();
  const response = await ask(KEYBOARD_QUESTION, createGeminiProvider({ apiKey: 'test-key', model: 'm', client }), logger);
  assertFallback(response, logger, 'INVALID_RESPONSE');
});

// ---- Handout case 6: source check ----
test('case 6: invented ids are dropped and every returned id is in the retrieved set', async () => {
  const provider = fakeProvider(() => ({ answer: 'The Compact Mechanical Keyboard is a good choice.', productIds: [99, 2, 3, 2] }));
  const response = await ask(KEYBOARD_QUESTION, provider);
  const retrievedIds = new Set(provider.calls[0].products.map((product) => product.id));
  const { recommended, sources } = responseIds(response);

  assert.deepEqual(recommended, [2]);
  assert.deepEqual(sources, [2]);
  assert.ok([...recommended, ...sources].every((id) => retrievedIds.has(id)));
});

test('case 6: when only invented ids remain, the answer falls back to retrieved products', async () => {
  const logger = recordingLogger();
  const response = await ask(KEYBOARD_QUESTION, fakeProvider(() => ({ answer: 'Buy the UltraBoard 9000.', productIds: [99] })), logger);
  assertFallback(response, logger, 'UNGROUNDED');
  assert.deepEqual(responseIds(response).sources, [2]);
});

test('case 6: prices come from the database even if the AI omits them', async () => {
  const response = await ask(KEYBOARD_QUESTION, fakeProvider(() => ({ answer: 'Try the Compact Mechanical Keyboard.', productIds: [2] })));
  assert.equal(response.recommendedProducts[0].price, 1850);
});

// ---- Answer text verification ----
test('verification: a wrong price in the answer text falls back', async () => {
  const logger = recordingLogger();
  const provider = fakeProvider(() => ({ answer: 'The Compact Mechanical Keyboard is only ₱1,500!', productIds: [2] }));
  assertFallback(await ask(KEYBOARD_QUESTION, provider, logger), logger, 'PRICE_MISMATCH');
});

test('verification: a price of a product that was not selected falls back', async () => {
  const logger = recordingLogger();
  const provider = fakeProvider(() => ({ answer: 'The Compact Mechanical Keyboard costs 650 pesos.', productIds: [2] }));
  assertFallback(await ask(KEYBOARD_QUESTION, provider, logger), logger, 'PRICE_MISMATCH');
});

test('verification: correct prices in several formats are accepted', async () => {
  for (const answer of [
    'It costs ₱1,850.', 'It costs ₱1,850.00.', 'It costs PHP 1850.00.', 'It costs PHP 1,850.', 'It costs Php1,850.',
    'It costs 1,850 pesos.', 'It costs 1,850.00.', 'It costs 1,850 PHP.', 'It costs P1850.', 'It costs P 1,850.'
  ]) {
    const response = await ask(KEYBOARD_QUESTION, fakeProvider(() => ({ answer, productIds: [2] })));
    assert.ok(!hasFallbackNote(response.answer), answer);
  }
});

test('verification: product names and specs such as "1080p" are not treated as prices', () => {
  assert.deepEqual(extractMentionedAmounts('The 1080p Webcam fits laptops up to 16 inches with 3 levels.'), []);
  assert.deepEqual(extractMentionedAmounts('₱1,450 or 1,450.00 or 1450 pesos'), [145000]);
});

test('verification: every supported price format is extracted, so a wrong price cannot slip through', () => {
  for (const text of ['PHP 1,200', 'php1200', '1,200.00', 'P1200', 'P 1200', 'P.1200', '1200 PHP', '₱1,200.00', '1,200 pesos']) {
    assert.deepEqual(extractMentionedAmounts(`Only ${text} today.`), [120000], text);
  }
});

// ---- Live finding (5 Nov 2026): lamp question rejected with PRICE_MISMATCH ----
test('live finding: naming and pricing a product without selecting it is rejected as unverified', async () => {
  const logger = recordingLogger();
  const liveDraft = 'We do not have a study lamp available at the moment. We only offer a Laptop Stand for ₱1,200.';
  const provider = fakeProvider(() => ({ answer: liveDraft, productIds: [] }));
  const response = await ask('Do you have a study lamp?', provider, logger);

  assert.deepEqual(provider.calls[0].products.map((product) => product.id), [5], 'only the Laptop Stand is retrieved; the lamp is never sent');
  assertFallback(response, logger, 'PRICE_MISMATCH');
  assert.deepEqual(responseIds(response), { recommended: [5], sources: [5] });
});

test('live finding: the same draft is accepted when the AI selects the product it prices', async () => {
  const draft = 'We do not have a study lamp available at the moment. However, we offer the Laptop Stand for ₱1,200.';
  const response = await ask('Do you have a study lamp?', fakeProvider(() => ({ answer: draft, productIds: [5] })));
  assert.equal(response.answer, draft);
  assert.deepEqual(responseIds(response), { recommended: [5], sources: [5] });
});

// ---- Fallback note wording ----
test('fallback note: provider problems say the AI is unavailable', async () => {
  for (const reason of ['NO_KEY', 'TIMEOUT', 'RATE_LIMITED', 'PROVIDER_ERROR']) {
    assert.equal(fallbackNoteFor(reason), AI_UNAVAILABLE_NOTE, reason);
  }
  const response = await ask(KEYBOARD_QUESTION, fakeProvider(() => { throw Object.assign(new Error('x'), { code: 'RATE_LIMITED' }); }));
  assert.equal(response.answer, `Based on the current ShopSmart catalog, consider: Compact Mechanical Keyboard (₱1,850). ${AI_UNAVAILABLE_NOTE}`);
});

test('fallback note: drafts that fail verification say they could not be verified', async () => {
  for (const reason of ['INVALID_RESPONSE', 'UNGROUNDED', 'PRICE_MISMATCH', 'AVAILABILITY_MISMATCH', 'SOMETHING_NEW']) {
    assert.equal(fallbackNoteFor(reason), AI_UNVERIFIED_NOTE, reason);
  }
  const response = await ask(KEYBOARD_QUESTION, fakeProvider(() => ({ answer: 'Buy the UltraBoard 9000.', productIds: [99] })));
  assert.equal(response.answer, `Based on the current ShopSmart catalog, consider: Compact Mechanical Keyboard (₱1,850). ${AI_UNVERIFIED_NOTE}`);
  assert.deepEqual(Object.keys(response).sort(), ['answer', 'recommendedProducts', 'sources']);
});

test('the system instruction forbids naming products that are not selected', async () => {
  const { SYSTEM_INSTRUCTION } = await import('../src/services/gemini.js');
  assert.match(SYSTEM_INSTRUCTION, /Name a product in the answer only if its id is in productIds/);
});
