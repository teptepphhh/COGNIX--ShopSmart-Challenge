import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { requireUser } from '../middleware/auth.js';
import { orderSchema } from '../validators/schemas.js';

function toOrderResponse(order) {
  return {
    ...order,
    total: Number(order.total),
    items: (order.items || []).map((item) => ({ ...item, unitPrice: Number(item.unitPrice) }))
  };
}

// Improvement 2: a checkout retried after a timeout must not create a second order.
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;

function findOrderByKey(db, userId, idempotencyKey) {
  return db.order.findFirst({ where: { userId, idempotencyKey }, include: { items: true } });
}

function replay(response, order) {
  response.setHeader('Idempotent-Replayed', 'true');
  return response.status(200).json(toOrderResponse(order));
}

export function createOrdersRouter({ db, loadUser }) {
  const router = Router();
  router.use(loadUser);
  // Every order route needs a signed-in customer. A guest gets 401 before any order is read.
  router.use(requireUser);

  router.post('/', async (request, response, next) => {
    const idempotencyKey = request.get('Idempotency-Key') || null;
    try {
      if (idempotencyKey !== null && !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
        return response.status(400).json({ error: { code: 'INVALID_IDEMPOTENCY_KEY', message: 'Idempotency-Key must be 8 to 100 letters, digits, - or _.' } });
      }
      // Same customer, same key: this is a retry of a checkout that already succeeded.
      if (idempotencyKey) {
        const existing = await findOrderByKey(db, request.user.id, idempotencyKey);
        if (existing) return replay(response, existing);
      }
      const parsed = orderSchema.safeParse(request.body);
      if (!parsed.success) return response.status(422).json({ error: { code: 'INVALID_ORDER', message: 'Check the customer and cart information.', details: parsed.error.flatten() } });

      const productIds = [...new Set(parsed.data.items.map((item) => item.productId))];
      const products = await db.product.findMany({ where: { id: { in: productIds }, active: true } });
      if (products.length !== productIds.length) return response.status(422).json({ error: { code: 'PRODUCT_UNAVAILABLE', message: 'One or more products are unavailable.' } });

      const productMap = new Map(products.map((product) => [product.id, product]));
      const normalizedItems = parsed.data.items.map((item) => ({ ...item, product: productMap.get(item.productId) }));
      const unavailable = normalizedItems.find((item) => item.quantity > item.product.stock);
      if (unavailable) return response.status(409).json({ error: { code: 'INSUFFICIENT_STOCK', message: `Only ${unavailable.product.stock} unit(s) of ${unavailable.product.name} are available.` } });

      const total = normalizedItems.reduce((sum, item) => sum.plus(new Prisma.Decimal(item.product.price).times(item.quantity)), new Prisma.Decimal(0));
      const order = await db.$transaction(async (transaction) => {
        for (const item of normalizedItems) {
          const updated = await transaction.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } }
          });
          if (updated.count !== 1) throw Object.assign(new Error('Stock changed while placing the order.'), { status: 409, code: 'STOCK_CHANGED' });
        }
        return transaction.order.create({
          data: {
            customerName: parsed.data.customerName, email: parsed.data.email, address: parsed.data.address, total,
            // The owner comes from the server session, never from the request body.
            userId: request.user.id,
            idempotencyKey,
            items: { create: normalizedItems.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.product.price })) }
          },
          include: { items: true }
        });
      });
      response.status(201).json(toOrderResponse(order));
    } catch (error) {
      // Two identical requests at the same moment: the unique (userId, idempotencyKey) index lets only
      // one transaction commit. The other is rolled back (stock included) and answers with the saved order.
      if (idempotencyKey && error?.code === 'P2002') {
        try {
          const existing = await findOrderByKey(db, request.user.id, idempotencyKey);
          if (existing) return replay(response, existing);
        } catch (lookupError) { return next(lookupError); }
      }
      next(error);
    }
  });

  // Only the signed-in customer's own orders.
  router.get('/', async (request, response, next) => {
    try {
      const orders = await db.order.findMany({
        where: { userId: request.user.id },
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { product: { select: { name: true, emoji: true } } } } }
      });
      response.json({ orders: orders.map(toOrderResponse) });
    } catch (error) { next(error); }
  });

  // Ownership is part of the database query. Another customer's order is answered with 404,
  // the same as a missing order, so the API does not reveal which order numbers exist.
  router.get('/:id', async (request, response, next) => {
    try {
      const id = Number(request.params.id);
      if (!Number.isInteger(id) || id < 1) return response.status(400).json({ error: { code: 'INVALID_ORDER_ID', message: 'Order ID must be a positive integer.' } });
      const order = await db.order.findFirst({
        where: { id, userId: request.user.id },
        include: { items: { include: { product: { select: { name: true, emoji: true } } } } }
      });
      if (!order) return response.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order could not be found.' } });
      response.json(toOrderResponse(order));
    } catch (error) { next(error); }
  });

  return router;
}
