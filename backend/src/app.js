import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import authRouter from './routes/auth.js';
import assistantRouter from './routes/assistant.js';
import { prisma } from './lib/prisma.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Behind a reverse proxy (Caddy on EC2) set TRUST_PROXY=1 so rate limits see the real visitor address.
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));
  app.use(helmet());
  app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
  // LAB 6: assign the request id before body parsing so JSON errors carry a trace id.
  app.use((request, response, next) => { request.id = crypto.randomUUID(); response.setHeader('X-Request-ID', request.id); next(); });
  app.use(express.json({ limit: '100kb' }));
  app.use(morgan(':method :url :status :response-time ms'));

  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
  // WEEK 6 IMPROVEMENT: readiness check that proves the database answers, not only that Node is running.
  app.get('/api/health/db', async (_request, response) => {
    try { await prisma.$queryRaw`SELECT 1`; response.json({ status: 'ok', database: 'up' }); }
    catch { response.status(503).json({ status: 'degraded', database: 'down' }); }
  });
  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/assistant', assistantRouter);
  app.use((_request, response) => response.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'API route could not be found.' } }));
  app.use(errorHandler);
  return app;
}
