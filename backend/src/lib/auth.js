import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
export const SESSION_COOKIE = 'shopsmart_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const DEV_SECRET = 'development-only-session-secret-change-me';

export function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set to at least 32 characters in production.');
  }
  return DEV_SECRET;
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, saltText, keyText] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !saltText || !keyText) return false;
  const expected = Buffer.from(keyText, 'base64url');
  const actual = await scrypt(password, Buffer.from(saltText, 'base64url'), expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

export function createSessionToken(userId, secret = getSessionSecret(), now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token, secret = getSessionSecret(), now = Date.now()) {
  if (typeof token !== 'string') return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isInteger(data.sub) || data.sub < 1) return null;
    if (typeof data.exp !== 'number' || data.exp * 1000 <= now) return null;
    return { userId: data.sub };
  } catch {
    return null;
  }
}

export function parseCookies(header = '') {
  const cookies = {};
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    const name = part.slice(0, index).trim();
    try { cookies[name] = decodeURIComponent(part.slice(index + 1).trim()); } catch { /* ignore malformed cookie */ }
  }
  return cookies;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000
  };
}
