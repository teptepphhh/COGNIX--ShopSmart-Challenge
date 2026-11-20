import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireUser } from '../middleware/auth.js';
import {
  SESSION_COOKIE, SESSION_TTL_MS, createSessionToken, hashPassword, hashSessionToken,
  publicUser, readCookie, sessionCookieOptions, verifyPassword
} from '../services/auth.js';
import { loginSchema, registerSchema } from '../validators/schemas.js';

export function createAuthRouter({ db, loadUser }) {
  const router = Router();
  router.use(loadUser);

  // Slows down password guessing. Behind Nginx this needs TRUST_PROXY=1 so each visitor has their own IP.
  const authLimiter = rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_request, response, _next, options) => response.status(options.statusCode).json({
      error: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Please wait a minute and try again.' }
    })
  });

  async function startSession(response, userId) {
    const token = createSessionToken();
    await db.session.create({ data: { tokenHash: hashSessionToken(token), userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) } });
    response.cookie(SESSION_COOKIE, token, sessionCookieOptions());
  }

  router.post('/register', authLimiter, async (request, response, next) => {
    try {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) return response.status(422).json({ error: { code: 'INVALID_ACCOUNT', message: 'Enter a name, a valid email and a password of 8 to 72 characters.' } });
      const { name, email, password } = parsed.data;
      const existing = await db.user.findUnique({ where: { email } });
      if (existing) return response.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists. Please sign in.' } });
      const user = await db.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });
      await startSession(response, user.id);
      response.status(201).json({ user: publicUser(user) });
    } catch (error) { next(error); }
  });

  router.post('/login', authLimiter, async (request, response, next) => {
    try {
      const parsed = loginSchema.safeParse(request.body);
      // Same message for every failure, so the response does not reveal which emails exist.
      const invalid = () => response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } });
      if (!parsed.success) return invalid();
      const user = await db.user.findUnique({ where: { email: parsed.data.email } });
      if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) return invalid();
      await startSession(response, user.id);
      response.json({ user: publicUser(user) });
    } catch (error) { next(error); }
  });

  router.post('/logout', async (request, response, next) => {
    try {
      const token = readCookie(request.headers.cookie, SESSION_COOKIE);
      if (token) await db.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
      const cookieOptions = sessionCookieOptions();
      delete cookieOptions.maxAge; // clearCookie sets its own expiry
      response.clearCookie(SESSION_COOKIE, cookieOptions);
      response.status(204).end();
    } catch (error) { next(error); }
  });

  router.get('/me', requireUser, (request, response) => response.json({ user: request.user }));

  return router;
}
