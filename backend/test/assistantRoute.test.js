// HTTP checks for the assistant route. Every request here fails validation
// before the database is queried, so no database or API key is needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('POST /api/assistant/questions: short questions get 422 and the rate limit returns JSON', async (t) => {
  const server = createApp().listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/assistant/questions`;
  const post = (body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  // Case 3: invalid input keeps the existing 422 contract.
  const invalid = await post({ question: 'hi' });
  assert.equal(invalid.status, 422);
  assert.deepEqual((await invalid.json()).error.code, 'INVALID_QUESTION');

  // 20 requests per minute are allowed; the 21st is rejected with a JSON error body.
  for (let index = 1; index < 20; index += 1) await post({ question: 'hi' });
  const limited = await post({ question: 'hi' });
  assert.equal(limited.status, 429);
  assert.match(limited.headers.get('content-type'), /application\/json/);
  assert.deepEqual((await limited.json()).error.code, 'RATE_LIMITED');
});
