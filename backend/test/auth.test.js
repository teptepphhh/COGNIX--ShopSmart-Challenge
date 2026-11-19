import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, hashPassword, readCookie, readSessionToken, verifyPassword } from '../src/lib/auth.js';
import { loginSchema, registerSchema } from '../src/validators/schemas.js';

test('a password verifies only against its own hash', () => {
  const stored = hashPassword('correct horse battery');
  assert.equal(verifyPassword('correct horse battery', stored), true);
  assert.equal(verifyPassword('wrong password', stored), false);
  assert.notEqual(stored, hashPassword('correct horse battery'));
});

test('a session token round-trips and rejects tampering or expiry', () => {
  const token = createSessionToken(7, 1000);
  assert.equal(readSessionToken(token, 2000), 7);
  assert.equal(readSessionToken(`${token}x`, 2000), null);
  assert.equal(readSessionToken(token.replace(/^./, 'A'), 2000), null);
  assert.equal(readSessionToken(token, 1000 + 1000 * 60 * 60 * 9), null);
  assert.equal(readSessionToken(undefined), null);
});

test('cookie reader finds the named cookie', () => {
  assert.equal(readCookie('a=1; ss_session=abc.def; b=2', 'ss_session'), 'abc.def');
  assert.equal(readCookie('a=1', 'ss_session'), null);
});

test('registration needs a short-enough valid body and an 8-character password', () => {
  assert.equal(registerSchema.safeParse({ name: 'Ana', email: 'ana@example.com', password: 'longenough1' }).success, true);
  assert.equal(registerSchema.safeParse({ name: 'Ana', email: 'ana@example.com', password: 'short' }).success, false);
  assert.equal(loginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success, false);
});
