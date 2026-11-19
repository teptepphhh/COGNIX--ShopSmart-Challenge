import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { clearedCookie, hashPassword, sessionCookie, verifyPassword } from '../lib/auth.js';
import { loginSchema, registerSchema } from '../validators/schemas.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait and try again.' } } });
const invalid = (response, parsed) => response.status(422).json({ error: { code: 'INVALID_INPUT', message: 'Check the form fields.', details: parsed.error.flatten() } });

router.post('/register', limiter, async (request, response, next) => {
  try {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) return invalid(response, parsed);
    const email = parsed.data.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) {
      return response.status(409).json({ error: { code: 'EMAIL_IN_USE', message: 'That email is already registered.' } });
    }
    const user = await prisma.user.create({ data: { name: parsed.data.name, email, passwordHash: hashPassword(parsed.data.password) } });
    response.setHeader('Set-Cookie', sessionCookie(user.id));
    response.status(201).json({ id: user.id, name: user.name, email: user.email });
  } catch (error) { next(error); }
});

router.post('/login', limiter, async (request, response, next) => {
  try {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return invalid(response, parsed);
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    const ok = user ? verifyPassword(parsed.data.password, user.passwordHash) : false;
    if (!ok) return response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } });
    response.setHeader('Set-Cookie', sessionCookie(user.id));
    response.json({ id: user.id, name: user.name, email: user.email });
  } catch (error) { next(error); }
});

router.post('/logout', (_request, response) => { response.setHeader('Set-Cookie', clearedCookie()); response.status(204).end(); });
router.get('/me', requireAuth, (request, response) => response.json(request.user));

export default router;
