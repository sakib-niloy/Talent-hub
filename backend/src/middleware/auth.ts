// Cookie sessions: a signed JWT in an httpOnly cookie. Every request re-loads the user, so
// blocking a user or bumping token_version revokes access immediately.
import type { CookieOptions, NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import type { AppContext } from '../context.js';
import { users } from '../db/schema.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import type { AuthUser } from '../types/express.js';

interface SessionClaims {
  sub: string;
  ver: number;
}

const AUDIENCE = 'talenthub-session';

const authColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  handle: users.handle,
  role: users.role,
  status: users.status,
  avatarUrl: users.avatarUrl,
  bio: users.bio,
  createdAt: users.createdAt,
  tokenVersion: users.tokenVersion,
};

export function cookieOptions(ctx: AppContext, maxAgeMs?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: ctx.config.isProduction,
    sameSite: 'lax',
    path: '/',
    ...(maxAgeMs !== undefined ? { maxAge: maxAgeMs } : {}),
  };
}

export function issueSession(ctx: AppContext, res: Response, user: Pick<AuthUser, 'id' | 'tokenVersion'>) {
  const ttlMs = ctx.config.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  const token = jwt.sign({ ver: user.tokenVersion } satisfies Omit<SessionClaims, 'sub'>, ctx.config.JWT_SECRET, {
    algorithm: 'HS256',
    audience: AUDIENCE,
    subject: String(user.id),
    expiresIn: Math.floor(ttlMs / 1000),
  });
  res.cookie(ctx.config.cookieName, token, cookieOptions(ctx, ttlMs));
}

export function clearSession(ctx: AppContext, res: Response) {
  res.clearCookie(ctx.config.cookieName, cookieOptions(ctx));
}

/** Optional auth: attaches req.user when a valid session cookie is present. */
export function sessionMiddleware(ctx: AppContext): RequestHandler {
  return async (req, res, next) => {
    const token = req.cookies?.[ctx.config.cookieName] as string | undefined;
    if (!token) return next();
    let claims: SessionClaims;
    try {
      claims = jwt.verify(token, ctx.config.JWT_SECRET, { algorithms: ['HS256'], audience: AUDIENCE }) as SessionClaims;
    } catch {
      clearSession(ctx, res);
      return next();
    }
    const [user] = await ctx.db.select(authColumns).from(users).where(eq(users.id, Number(claims.sub))).limit(1);
    if (!user || user.tokenVersion !== claims.ver) {
      clearSession(ctx, res);
      return next();
    }
    if (user.status === 'blocked') {
      req.accountBlocked = true;
      return next();
    }
    req.user = user;
    next();
  };
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (req.user) return next();
  next(req.accountBlocked ? forbidden('This account has been blocked') : unauthorized());
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(req.accountBlocked ? forbidden('This account has been blocked') : unauthorized());
  if (req.user.role !== 'admin') return next(forbidden('Admins only'));
  next();
}

/** Returns the authenticated user (use after requireAuth). */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}

export { authColumns };
