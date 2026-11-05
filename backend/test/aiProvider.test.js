import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiProvider, getProviderFromEnv, parseDraftText } from '../src/services/aiProvider.js';
import { verifyDraft } from '../src/services/answerVerifier.js';

const KEY = 'test-key-should-never-leak';
const facts = [{ id: 2, name: 'Compact Mechanical Keyboard', description: 'Hot-swappable compact keyboard with tactile switches.', category: 'Accessories', price: 1850, stock: 8 }];
const reply = (body, status = 200) => async () => ({ ok: status < 400, status, json: async () => body });
const geminiBody = (text) => ({ candidates: [{ content: { parts: [{ text }] } }] });

test('the key is sent in a header, not the URL, and facts are in the request', async () => {
  let seen;
  const provider = createGeminiProvider({ apiKey: KEY, fetchImpl: async (url, options) => { seen = { url, options }; return reply(geminiBody('{"answer":"ok","productIds":[2]}'))(); } });
  const draft = await provider.draftAnswer('keyboard', facts);
  assert.deepEqual(draft, { answer: 'ok', productIds: [2] });
  assert.ok(!seen.url.includes(KEY));
  assert.equal(seen.options.headers['x-goog-api-key'], KEY);
  assert.match(seen.options.body, /Compact Mechanical Keyboard/);
});

test('provider errors are classified and never contain the key', async () => {
  const cases = [
    [reply({}, 429), 'PROVIDER_RATE_LIMITED'],
    [reply({}, 503), 'PROVIDER_UNAVAILABLE'],
    [reply({}, 403), 'PROVIDER_AUTH'],
    [async () => { throw new TypeError('fetch failed'); }, 'PROVIDER_UNAVAILABLE'],
    [reply(geminiBody('not json at all')), 'PROVIDER_INVALID_FORMAT'],
    [reply({ candidates: [] }), 'PROVIDER_INVALID_FORMAT']
  ];
  for (const [fetchImpl, code] of cases) {
    const provider = createGeminiProvider({ apiKey: KEY, fetchImpl });
    await assert.rejects(provider.draftAnswer('keyboard', facts), (error) => error.code === code && !error.message.includes(KEY));
  }
});

test('a slow provider times out', async () => {
  const slow = (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  const provider = createGeminiProvider({ apiKey: KEY, timeoutMs: 20, fetchImpl: slow });
  await assert.rejects(provider.draftAnswer('keyboard', facts), { code: 'PROVIDER_TIMEOUT' });
});

test('parseDraftText accepts fenced JSON and rejects the wrong shape', () => {
  assert.deepEqual(parseDraftText('```json\n{"answer":"Hi","productIds":[]}\n```'), { answer: 'Hi', productIds: [] });
  assert.throws(() => parseDraftText('{"text":"Hi"}'), { code: 'PROVIDER_INVALID_FORMAT' });
});

test('AI_PROVIDER=none or a missing key disables the provider', () => {
  assert.equal(getProviderFromEnv({ AI_PROVIDER: 'none', GEMINI_API_KEY: KEY }), null);
  assert.equal(getProviderFromEnv({}), null);
  assert.equal(getProviderFromEnv({ GEMINI_API_KEY: KEY, GEMINI_MODEL: 'm' }).model, 'm');
});

test('verifyDraft flags unsupported stock, availability and extra details', () => {
  const check = (answer) => verifyDraft({ answer, productIds: [2] }, { facts, catalog: [], budget: 2000 }).issues;
  assert.deepEqual(check('The Compact Mechanical Keyboard is ₱1,850 with 8 in stock, under your ₱2,000 budget.'), []);
  assert.ok(check('Only 2 left!').includes('UNSUPPORTED_STOCK'));
  assert.ok(check('It is sold out.').includes('UNSUPPORTED_AVAILABILITY'));
  assert.ok(check('It comes with free shipping and a 2-year warranty.').includes('UNSUPPORTED_DETAIL'));
  assert.ok(verifyDraft({ answer: 'Also see the Wireless Mouse.', productIds: [2] }, { facts, catalog: [{ id: 1, name: 'Wireless Mouse' }] }).issues.includes('UNSELECTED_PRODUCT_MENTIONED'));
});
