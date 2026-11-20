// Improvement 2: a retried checkout with the same Idempotency-Key creates only one order
// and decrements stock only once. In-memory fake database, no PostgreSQL needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { readCookie } from '../src/services/auth.js';

function createFakeDb({ failCreateOnce = false } = {}) {
  const users = [];
  const sessions = [];
  const products = [{ id: 1, name: 'Wireless Mouse', price: 650, stock: 5, active: true }];
  const orders = [];
  let nextId = 1;
  let failNext = failCreateOnce;
  const matches = (order, where) => Object.entries(where).every(([key, value]) => order[key] === value);
  const db = {
    products,
    orders,
    user: {
      findUnique: async ({ where }) => users.find((user) => user.email === where.email) || null,
      create: async ({ data }) => { const user = { id: users.length + 1, ...data }; users.push(user); return user; }
    },
    session: {
      create: async ({ data }) => { sessions.push({ id: sessions.length + 1, ...data }); },
      findUnique: async ({ where }) => {
        const session = sessions.find((item) => item.tokenHash === where.tokenHash);
        return session ? { ...session, user: users.find((user) => user.id === session.userId) } : null;
      }
    },
    product: {
      findMany: async ({ where }) => products.filter((product) => where.id.in.includes(product.id) && product.active)
    },
    order: {
      findFirst: async ({ where }) => orders.find((order) => matches(order, where)) || null
    },
    async $transaction(work) {
      // Work on copies, commit only if the callback finishes (like a real rollback).
      const stockBefore = products.map((product) => product.stock);
      const tx = {
        product: {
          updateMany: async ({ where, data }) => {
            const product = products.find((item) => item.id === where.id && item.stock >= where.stock.gte);
            if (!product) return { count: 0 };
            product.stock -= data.stock.decrement;
            return { count: 1 };
          }
        },
        order: {
          create: async ({ data }) => {
            const duplicate = data.idempotencyKey && orders.some((order) => order.userId === data.userId && order.idempotencyKey === data.idempotencyKey);
            if (duplicate || failNext) {
              failNext = false;
              // Simulates the other request committing first, then this one hitting the unique index.
              if (!duplicate) orders.push({ id: nextId++, userId: data.userId, idempotencyKey: data.idempotencyKey, total: data.total, status: 'PENDING', items: [] });
              throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
            }
            const order = { id: nextId++, ...data, status: 'PENDING', items: data.items.create.map((item, index) => ({ id: index + 1, ...item })) };
            orders.push(order);
            return order;
          }
        }
      };
      try { return await work(tx); } catch (error) {
        products.forEach((product, index) => { product.stock = stockBefore[index]; });
        throw error;
      }
    }
  };
  return db;
}

async function signedInClient(t, db) {
  const server = createApp({ db, checkDatabase: async () => {} }).listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const registered = await fetch(`${base}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Ana Test', email: 'ana@example.com', password: 'demo-pass-123' })
  });
  const cookie = `shopsmart_session=${readCookie(registered.headers.get('set-cookie'), 'shopsmart_session')}`;
  return async (key, body = { customerName: 'Ana Test', email: 'ana@example.com', address: '2 Mabini Street, Sample City', items: [{ productId: 1, quantity: 1 }] }) => {
    const response = await fetch(`${base}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie, ...(key ? { 'Idempotency-Key': key } : {}) },
      body: JSON.stringify(body)
    });
    return { status: response.status, replayed: response.headers.get('idempotent-replayed'), body: await response.json() };
  };
}

test('the same Idempotency-Key twice creates one order and decrements stock once', async (t) => {
  const db = createFakeDb();
  const checkout = await signedInClient(t, db);
  const first = await checkout('checkout-attempt-0001');
  const retry = await checkout('checkout-attempt-0001');
  assert.equal(first.status, 201);
  assert.equal(retry.status, 200);
  assert.equal(retry.replayed, 'true');
  assert.equal(retry.body.id, first.body.id);
  assert.equal(db.orders.length, 1);
  assert.equal(db.products[0].stock, 4);
});

test('a different Idempotency-Key is a new order', async (t) => {
  const db = createFakeDb();
  const checkout = await signedInClient(t, db);
  const first = await checkout('checkout-attempt-0001');
  const second = await checkout('checkout-attempt-0002');
  assert.equal(second.status, 201);
  assert.notEqual(second.body.id, first.body.id);
  assert.equal(db.products[0].stock, 3);
});

test('two requests at the same moment: the unique index loser is rolled back and gets the saved order', async (t) => {
  const db = createFakeDb({ failCreateOnce: true });
  const checkout = await signedInClient(t, db);
  const result = await checkout('checkout-attempt-race1');
  assert.equal(result.status, 200);
  assert.equal(result.replayed, 'true');
  assert.equal(db.orders.length, 1);
  assert.equal(db.products[0].stock, 5, 'the losing transaction did not decrement stock');
});

test('an invalid Idempotency-Key is rejected with 400 before any order is created', async (t) => {
  const db = createFakeDb();
  const checkout = await signedInClient(t, db);
  const result = await checkout('bad key!');
  assert.equal(result.status, 400);
  assert.equal(result.body.error.code, 'INVALID_IDEMPOTENCY_KEY');
  assert.equal(db.orders.length, 0);
});

test('without a key the old behaviour is kept (each request is a new order)', async (t) => {
  const db = createFakeDb();
  const checkout = await signedInClient(t, db);
  await checkout(null);
  await checkout(null);
  assert.equal(db.orders.length, 2);
});
