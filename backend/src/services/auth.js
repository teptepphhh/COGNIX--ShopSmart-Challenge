// Password hashing, session tokens and cookie settings for ShopSmart sign-in.
// Uses only node:crypto, so no extra package is needed.
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

export const SESSION_COOKIE = 'shopsmart_session';
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours, enough for a classroom demo

// Stored as "scrypt$<salt hex>$<hash hex>". The plain password is never stored or logged.
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// The browser keeps the random token; the database keeps only its SHA-256 hash.
export function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function readCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      try { return decodeURIComponent(part.slice(index + 1).trim()); } catch { return null; }
    }
  }
  return null;
}

// httpOnly: JavaScript in the page cannot read it. secure: only sent over HTTPS.
// COOKIE_SECURE=true must be set on the HTTPS deployment. Local http://localhost keeps it false.
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS
  };
}

export function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}
