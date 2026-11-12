// D5: /api/health must report the database state.
// A fake database check is passed to createApp, so no real database is needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

async function getHealth(t, options) {
  const server = createApp(options).listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
  return { status: response.status, text: await response.text() };
}

test('health returns 200 with database ok when the database answers', async (t) => {
  const { status, text } = await getHealth(t, { checkDatabase: async () => {} });
  assert.equal(status, 200);
  assert.deepEqual(JSON.parse(text), { status: 'ok', database: 'ok' });
});

test('health returns 503 when the database check fails, without error details', async (t) => {
  const failingCheck = async () => {
    throw new Error("Can't reach database server at localhost:5432");
  };
  const { status, text } = await getHealth(t, { checkDatabase: failingCheck });
  assert.equal(status, 503);
  assert.deepEqual(JSON.parse(text), { status: 'error', database: 'unreachable' });
  assert.ok(!text.includes('localhost') && !text.includes('5432'), 'no internal details in the response');
});

test('health returns 503 quickly when the database check hangs', async (t) => {
  const started = Date.now();
  const { status, text } = await getHealth(t, { checkDatabase: () => new Promise(() => {}), healthTimeoutMs: 50 });
  assert.equal(status, 503);
  assert.deepEqual(JSON.parse(text), { status: 'error', database: 'unreachable' });
  assert.ok(Date.now() - started < 1000, 'the health route does not wait for a stuck database');
});
