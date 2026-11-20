import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { createSessionToken, hashPassword, SESSION_COOKIE, sessionCookieOptions, verifyPassword } from '../lib/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { loginSchema, registerSchema } from '../validators/schemas.js';
const router = Router();

const authLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
const publicUser = ({ id, name, email }) => ({ id, name, email });

function startSession(response, userId) {
  response.cookie(SESSION_COOKIE, createSessionToken(userId), sessionCookieOptions());
}

router.post('/register', authLimiter, async (request, response, next) => {
  try {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) return response.status(422).json({ error: { code: 'INVALID_REGISTRATION', message: 'Enter a name, a valid email and a password of 8 to 128 characters.' } });
    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return response.status(409).json({ error: { code: 'EMAIL_IN_USE', message: 'An account with this email already exists.' } });
    const user = await prisma.user.create({
      data: { name: parsed.data.name, email, passwordHash: await hashPassword(parsed.data.password) }
    });
    startSession(response, user.id);
    response.status(201).json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/login', authLimiter, async (request, response, next) => {
  try {
    const parsed = loginSchema.safeParse(request.body);
    const invalid = () => response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } });
    if (!parsed.success) return invalid();
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) return invalid();
    startSession(response, user.id);
    response.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/logout', (_request, response) => {
  const options = sessionCookieOptions();
  delete options.maxAge;
  response.clearCookie(SESSION_COOKIE, options);
  response.status(204).end();
});

router.get('/me', requireAuth, async (request, response, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: request.userId } });
    if (!user) return response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Sign in to continue.' } });
    response.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

export default router;
