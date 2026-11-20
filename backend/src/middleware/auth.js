import { parseCookies, SESSION_COOKIE, verifySessionToken } from '../lib/auth.js';

export function attachUser(request, _response, next) {
  const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];
  const session = token ? verifySessionToken(token) : null;
  request.userId = session?.userId ?? null;
  next();
}

export function requireAuth(request, response, next) {
  if (!request.userId) {
    return response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Sign in to continue.' } });
  }
  next();
}
