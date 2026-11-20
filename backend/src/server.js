import 'dotenv/config';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';

const port = Number(process.env.PORT || 3000);
// On EC2, HOST=127.0.0.1 keeps the API internal: only Nginx on the same machine can reach it.
const host = process.env.HOST || undefined;
const app = createApp();
const onListening = () => console.log(`ShopSmart API running on ${host || 'all interfaces'}:${port}`);
const server = host ? app.listen(port, host, onListening) : app.listen(port, onListening);

async function shutdown(signal) {
  console.log(`\n${signal} received. Closing ShopSmart API.`);
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
