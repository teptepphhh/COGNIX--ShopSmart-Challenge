// Identifies the ShopSmart customer from the session cookie.
// This is application identity. It is separate from AWS IAM, which only controls who manages AWS resources.
import { SESSION_COOKIE, hashSessionToken, publicUser, readCookie } from '../services/auth.js';

export function createLoadUser(db) {
  return async function loadUser(request, _response, next) {
    try {
      request.user = null;
      const token = readCookie(request.headers.cookie, SESSION_COOKIE);
      if (!token) return next();
      const session = await db.session.findUnique({ where: { tokenHash: hashSessionToken(token) }, include: { user: true } });
      if (session && session.expiresAt > new Date()) {
        request.user = publicUser(session.user);
        request.sessionId = session.id;
      }
      next();
    } catch (error) { next(error); }
  };
}

export function requireUser(request, response, next) {
  if (!request.user) return response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Please sign in to continue.' } });
  next();
}
