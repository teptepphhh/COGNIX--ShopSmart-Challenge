import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import assistantRouter from './routes/assistant.js';
import { prisma } from './lib/prisma.js';

export const HEALTH_DB_TIMEOUT_MS = 2000;

// Default database check for /api/health: one tiny query.
export async function checkDatabaseWithPrisma() {
  await prisma.$queryRaw`SELECT 1`;
}

// Rejects if the check takes longer than timeoutMs, so the health route always answers quickly.
function withTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Database check timed out')), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// checkDatabase can be replaced in tests, so the health route can be tested without a real database.
export function createApp({ checkDatabase = checkDatabaseWithPrisma, healthTimeoutMs = HEALTH_DB_TIMEOUT_MS } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
  app.use(express.json({ limit: '100kb' }));
  app.use((request, response, next) => { request.id = crypto.randomUUID(); response.setHeader('X-Request-ID', request.id); next(); });
  app.use(morgan(':method :url :status :response-time ms'));

  app.get('/api/health', async (_request, response) => {
    try {
      await withTimeout(Promise.resolve().then(checkDatabase), healthTimeoutMs);
      response.json({ status: 'ok', database: 'ok' });
    } catch {
      // No error details in the response or the log line: only the result.
      console.warn('[health] database check failed');
      response.status(503).json({ status: 'error', database: 'unreachable' });
    }
  });
  app.use('/api/products', productsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/assistant', assistantRouter);
  app.use((_request, response) => response.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'API route could not be found.' } }));
  app.use((error, request, response, _next) => {
    console.error(`[${request.id}]`, error);
    response.status(error.status || 500).json({ error: { code: error.code || 'INTERNAL_ERROR', message: error.status ? error.message : 'The server could not complete the request.', traceId: request.id } });
  });
  return app;
}
