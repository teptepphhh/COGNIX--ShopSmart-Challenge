import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { prisma } from './lib/prisma.js';
import { attachUser } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import assistantRouter from './routes/assistant.js';

morgan.token('id', (request) => request.id);

export function createApp({ db = prisma } = {}) {
  const app = express();
  app.disable('x-powered-by');
  // Behind Nginx on the same host: trust exactly one proxy hop so rate limits see the real client IP.
  if (process.env.TRUST_PROXY === '1' || process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use((request, response, next) => { request.id = crypto.randomUUID(); response.setHeader('X-Request-ID', request.id); next(); });
  // Logs method, path, status and timing only. Bodies, cookies and headers are never logged.
  app.use(morgan(':id :method :url :status :response-time ms'));
  app.use(attachUser);

  app.get('/api/health', async (_request, response) => {
    try {
      await db.$queryRaw`SELECT 1`;
      response.json({ status: 'ok', database: 'ok' });
    } catch {
      response.status(503).json({ status: 'degraded', database: 'unavailable' });
    }
  });
  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/assistant', assistantRouter);
  app.use((_request, response) => response.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'API route could not be found.' } }));
  app.use((error, request, response, _next) => {
    console.error(`[${request.id}]`, error?.message || error);
    response.status(error.status || 500).json({ error: { code: error.code || 'INTERNAL_ERROR', message: error.status ? error.message : 'The server could not complete the request.', traceId: request.id } });
  });
  return app;
}
