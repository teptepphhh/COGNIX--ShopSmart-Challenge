// Improvement 1: the API reports whether answers come from a live AI provider or the catalog only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { assistantMode } from '../src/routes/assistant.js';
import { createApp } from '../src/app.js';

test('assistantMode is catalog-only without a provider and live-ai with one', () => {
  assert.equal(assistantMode(null), 'catalog-only');
  assert.equal(assistantMode({ generate: async () => ({}) }), 'live-ai');
});

test('GET /api/assistant/status reports catalog-only when GEMINI_API_KEY is empty', async (t) => {
  const saved = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = '';
  t.after(() => { process.env.GEMINI_API_KEY = saved; });
  const server = createApp({ checkDatabase: async () => {} }).listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/assistant/status`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { mode: 'catalog-only' });
});
