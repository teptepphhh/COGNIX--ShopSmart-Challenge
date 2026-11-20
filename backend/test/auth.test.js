import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSessionToken, hashPassword, parseCookies, SESSION_TTL_SECONDS, verifyPassword, verifySessionToken
} from '../src/lib/auth.js';
import { attachUser, requireAuth } from '../src/middleware/auth.js';
import { loginSchema, registerSchema } from '../src/validators/schemas.js';

const secret = 'test-secret-that-is-at-least-32-characters';

test('passwords are hashed with a salt and verified', async () => {
  const first = await hashPassword('correct horse battery');
  const second = await hashPassword('correct horse battery');
  assert.notEqual(first, second);
  assert.equal(first.includes('correct horse'), false);
  assert.equal(await verifyPassword('correct horse battery', first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
  assert.equal(await verifyPassword('anything', 'not-a-hash'), false);
});

test('a signed session token identifies its user', () => {
  assert.deepEqual(verifySessionToken(createSessionToken(7, secret), secret), { userId: 7 });
});

test('a tampered session token is rejected', () => {
  const token = createSessionToken(7, secret);
  const forgedPayload = Buffer.from(JSON.stringify({ sub: 8, exp: 9_999_999_999 })).toString('base64url');
  assert.equal(verifySessionToken(`${forgedPayload}.${token.split('.')[1]}`, secret), null);
  assert.equal(verifySessionToken(token, 'a-different-secret-of-thirty-two-chars'), null);
  assert.equal(verifySessionToken('garbage', secret), null);
});

test('an expired session token is rejected', () => {
  const issued = Date.now() - (SESSION_TTL_SECONDS + 1) * 1000;
  assert.equal(verifySessionToken(createSessionToken(7, secret, issued), secret), null);
});

test('cookies are parsed from the request header', () => {
  assert.deepEqual(parseCookies('a=1; shopsmart_session=abc.def'), { a: '1', shopsmart_session: 'abc.def' });
});

function fakeResponse() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test('a guest is refused by requireAuth', () => {
  const request = { headers: {} };
  attachUser(request, {}, () => {});
  const response = fakeResponse();
  let calledNext = false;
  requireAuth(request, response, () => { calledNext = true; });
  assert.equal(calledNext, false);
  assert.equal(response.statusCode, 401);
  assert.equal(response.body.error.code, 'AUTH_REQUIRED');
});

test('a signed-in customer passes requireAuth with their own user id', () => {
  const request = { headers: { cookie: `shopsmart_session=${createSessionToken(5)}` } };
  attachUser(request, {}, () => {});
  let calledNext = false;
  requireAuth(request, fakeResponse(), () => { calledNext = true; });
  assert.equal(calledNext, true);
  assert.equal(request.userId, 5);
});

test('registration requires a password of at least 8 characters', () => {
  assert.equal(registerSchema.safeParse({ name: 'Ana Reyes', email: 'ana@example.com', password: 'short' }).success, false);
  assert.equal(registerSchema.safeParse({ name: 'Ana Reyes', email: 'ana@example.com', password: 'long enough' }).success, true);
  assert.equal(loginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success, false);
});
