import 'dotenv/config';
import { createApp } from './app.js';
import { getSessionSecret } from './lib/auth.js';
import { prisma } from './lib/prisma.js';

function checkConfiguration() {
  const missing = ['DATABASE_URL', ...(process.env.NODE_ENV === 'production' ? ['FRONTEND_URL', 'SESSION_SECRET'] : [])]
    .filter((name) => !process.env[name]);
  if (missing.length) {
    console.error(`Missing required environment variable(s): ${missing.join(', ')}. See backend/.env.example.`);
    process.exit(1);
  }
  try { getSessionSecret(); } catch (error) { console.error(error.message); process.exit(1); }
}

checkConfiguration();
const port = Number(process.env.PORT || 3000);
// In production set HOST=127.0.0.1 so only Nginx on the same machine can reach the API.
const host = process.env.HOST || undefined;
const server = createApp().listen(port, host, () => console.log(`ShopSmart API listening on ${host || 'all interfaces'}:${port} (${process.env.NODE_ENV || 'development'})`));

async function shutdown(signal) {
  console.log(`\n${signal} received. Closing ShopSmart API.`);
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
