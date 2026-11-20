// Sign-in and order ownership. An in-memory fake database is passed to createApp,
// so these tests need no PostgreSQL. They prove the server, not the browser, enforces ownership.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { hashPassword, hashSessionToken, readCookie, verifyPassword } from '../src/services/auth.js';

function createFakeDb() {
  const users = [];
  const sessions = [];
  const orders = [
    { id: 1, userId: null, customerName: 'Old Order', email: 'old@example.com', address: '1 Old Street, Sample City', status: 'PENDING', total: 650, items: [] }
  ];
  let nextUserId = 1;
  let nextSessionId = 1;
  return {
    orders,
    sessions,
    user: {
      findUnique: async ({ where }) => users.find((user) => user.email === where.email) || null,
      create: async ({ data }) => { const user = { id: nextUserId++, ...data }; users.push(user); return user; }
    },
    session: {
      create: async ({ data }) => { const session = { id: nextSessionId++, ...data }; sessions.push(session); return session; },
      findUnique: async ({ where }) => {
        const session = sessions.find((item) => item.tokenHash === where.tokenHash);
        return session ? { ...session, user: users.find((user) => user.id === session.userId) } : null;
      },
      deleteMany: async ({ where }) => {
        const index = sessions.findIndex((item) => item.tokenHash === where.tokenHash);
        if (index !== -1) sessions.splice(index, 1);
        return { count: index === -1 ? 0 : 1 };
      }
    },
    order: {
      findMany: async ({ where }) => orders.filter((order) => order.userId === where.userId),
      findFirst: async ({ where }) => orders.find((order) => order.id === where.id && order.userId === where.userId) || null
    }
  };
}

async function startServer(t, db) {
  const server = createApp({ db, checkDatabase: async () => {} }).listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  return async (path, { method = 'GET', body, cookie } = {}) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await response.text();
    return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : null };
  };
}

function sessionCookieFrom(response) {
  const header = response.headers.get('set-cookie');
  const token = readCookie(header, 'shopsmart_session');
  return token ? `shopsmart_session=${token}` : null;
}

test('passwords are stored as a scrypt hash and verified', async () => {
  const stored = await hashPassword('demo-pass-123');
  assert.match(stored, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.ok(!stored.includes('demo-pass-123'));
  assert.equal(await verifyPassword('demo-pass-123', stored), true);
  assert.equal(await verifyPassword('wrong-password', stored), false);
  assert.equal(await verifyPassword('anything', 'not-a-hash'), false);
});

test('register sets an httpOnly cookie, stores only a token hash, and /me returns the customer', async (t) => {
  const db = createFakeDb();
  const call = await startServer(t, db);
  const registered = await call('/auth/register', { method: 'POST', body: { name: 'Ana Test', email: 'Ana@Example.com', password: 'demo-pass-123' } });
  assert.equal(registered.status, 201);
  assert.deepEqual(registered.body.user, { id: 1, name: 'Ana Test', email: 'ana@example.com' });
  assert.ok(!JSON.stringify(registered.body).includes('passwordHash'));
  const setCookie = registered.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  const cookie = sessionCookieFrom(registered);
  const token = cookie.split('=')[1];
  assert.equal(db.sessions[0].tokenHash, hashSessionToken(token));
  assert.notEqual(db.sessions[0].tokenHash, token);

  const me = await call('/auth/me', { cookie });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, 'ana@example.com');
});

test('register rejects a duplicate email and invalid input', async (t) => {
  const call = await startServer(t, createFakeDb());
  await call('/auth/register', { method: 'POST', body: { name: 'Ana Test', email: 'ana@example.com', password: 'demo-pass-123' } });
  const duplicate = await call('/auth/register', { method: 'POST', body: { name: 'Ana Again', email: 'ANA@example.com', password: 'demo-pass-456' } });
  assert.equal(duplicate.status, 409);
  const shortPassword = await call('/auth/register', { method: 'POST', body: { name: 'Ben Test', email: 'ben@example.com', password: 'short' } });
  assert.equal(shortPassword.status, 422);
});

test('login gives the same 401 for a wrong password and an unknown email', async (t) => {
  const call = await startServer(t, createFakeDb());
  await call('/auth/register', { method: 'POST', body: { name: 'Ana Test', email: 'ana@example.com', password: 'demo-pass-123' } });
  const wrongPassword = await call('/auth/login', { method: 'POST', body: { email: 'ana@example.com', password: 'nope-nope-1' } });
  const unknownEmail = await call('/auth/login', { method: 'POST', body: { email: 'nobody@example.com', password: 'nope-nope-1' } });
  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownEmail.status, 401);
  assert.deepEqual(wrongPassword.body, unknownEmail.body);
  const ok = await call('/auth/login', { method: 'POST', body: { email: 'ana@example.com', password: 'demo-pass-123' } });
  assert.equal(ok.status, 200);
  assert.ok(sessionCookieFrom(ok));
});

test('guest is refused every order route with 401', async (t) => {
  const call = await startServer(t, createFakeDb());
  assert.equal((await call('/orders')).status, 401);
  assert.equal((await call('/orders/1')).status, 401);
  const post = await call('/orders', { method: 'POST', body: { customerName: 'Guest', email: 'guest@example.com', address: '1 Guest Street, Sample City', items: [{ productId: 1, quantity: 1 }] } });
  assert.equal(post.status, 401);
  assert.equal(post.body.error.code, 'AUTH_REQUIRED');
  assert.equal((await call('/auth/me')).status, 401);
});

test('owner can read their order; another customer gets 404 for the same order', async (t) => {
  const db = createFakeDb();
  const call = await startServer(t, db);
  const ana = sessionCookieFrom(await call('/auth/register', { method: 'POST', body: { name: 'Ana Test', email: 'ana@example.com', password: 'demo-pass-123' } }));
  const ben = sessionCookieFrom(await call('/auth/register', { method: 'POST', body: { name: 'Ben Test', email: 'ben@example.com', password: 'demo-pass-456' } }));
  db.orders.push({ id: 2, userId: 1, customerName: 'Ana Test', email: 'ana@example.com', address: '2 Mabini Street, Sample City', status: 'PENDING', total: 1850, items: [] });

  const owner = await call('/orders/2', { cookie: ana });
  assert.equal(owner.status, 200);
  assert.equal(owner.body.id, 2);

  const other = await call('/orders/2', { cookie: ben });
  assert.equal(other.status, 404);
  assert.equal(other.body.error.code, 'ORDER_NOT_FOUND');

  const anaList = await call('/orders', { cookie: ana });
  const benList = await call('/orders', { cookie: ben });
  assert.deepEqual(anaList.body.orders.map((order) => order.id), [2]);
  assert.deepEqual(benList.body.orders, []);

  // Orders created before sign-in existed have no owner, so nobody can read them through the API.
  assert.equal((await call('/orders/1', { cookie: ana })).status, 404);
  assert.equal((await call('/orders/abc', { cookie: ana })).status, 400);
});

test('logout deletes the session, so the old cookie no longer works', async (t) => {
  const db = createFakeDb();
  const call = await startServer(t, db);
  const cookie = sessionCookieFrom(await call('/auth/register', { method: 'POST', body: { name: 'Ana Test', email: 'ana@example.com', password: 'demo-pass-123' } }));
  const logout = await call('/auth/logout', { method: 'POST', cookie });
  assert.equal(logout.status, 204);
  assert.equal(db.sessions.length, 0);
  assert.equal((await call('/auth/me', { cookie })).status, 401);
});

test('an expired session is treated as a guest', async (t) => {
  const db = createFakeDb();
  const call = await startServer(t, db);
  const cookie = sessionCookieFrom(await call('/auth/register', { method: 'POST', body: { name: 'Ana Test', email: 'ana@example.com', password: 'demo-pass-123' } }));
  db.sessions[0].expiresAt = new Date(Date.now() - 1000);
  assert.equal((await call('/auth/me', { cookie })).status, 401);
});
