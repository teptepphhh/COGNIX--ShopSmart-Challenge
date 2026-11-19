import { prisma } from '../lib/prisma.js';
import { COOKIE_NAME, readCookie, readSessionToken } from '../lib/auth.js';

export async function requireAuth(request, response, next) {
  try {
    const userId = readSessionToken(readCookie(request.headers.cookie, COOKIE_NAME));
    const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } }) : null;
    if (!user) return response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Please sign in to continue.' } });
    request.user = user;
    next();
  } catch (error) { next(error); }
}
