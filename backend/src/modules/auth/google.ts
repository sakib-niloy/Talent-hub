// Google OAuth 2.0 authorization-code flow (no Passport, no server sessions).
// State + post-login path travel in a short-lived signed httpOnly cookie (CSRF protection).
import crypto from 'node:crypto';
import { Router, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import type { AppContext } from '../../context.js';
import { users } from '../../db/schema.js';
import { authColumns, cookieOptions, issueSession } from '../../middleware/auth.js';
import { unavailable } from '../../lib/errors.js';
import { generateHandle } from '../../lib/handles.js';

const STATE_COOKIE = 'th_oauth';
const AUDIENCE = 'google-oauth-state';

interface GoogleProfile {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/** Only allow same-site relative paths after login (prevents open redirects). */
export function safeNextPath(next: unknown): string {
  return typeof next === 'string' && /^\/(?![/\\])[\w\-./?=&%#]*$/.test(next) ? next : '/feed';
}

export function googleRoutes(ctx: AppContext): Router {
  const router = Router();
  const { config } = ctx;

  const fail = (res: Response, reason: string) => {
    ctx.logger.warn({ reason }, 'google oauth failed');
    res.clearCookie(STATE_COOKIE, cookieOptions(ctx));
    res.redirect(302, `${config.FRONTEND_URL}/signin?error=oauth`);
  };

  router.use((_req, _res, next) => {
    next(config.googleOAuthEnabled ? undefined : unavailable('Google sign-in is not configured'));
  });

  router.get('/', (req, res) => {
    const state = crypto.randomBytes(24).toString('base64url');
    const signed = jwt.sign({ state, next: safeNextPath(req.query.next) }, config.JWT_SECRET, {
      algorithm: 'HS256',
      audience: AUDIENCE,
      expiresIn: 600,
    });
    res.cookie(STATE_COOKIE, signed, cookieOptions(ctx, 600_000));
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: config.GOOGLE_CLIENT_ID!,
      redirect_uri: config.googleCallbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    }).toString();
    res.redirect(302, url.toString());
  });

  router.get('/callback', async (req, res) => {
    let saved: { state: string; next: string };
    try {
      saved = jwt.verify(String(req.cookies?.[STATE_COOKIE] ?? ''), config.JWT_SECRET, {
        algorithms: ['HS256'],
        audience: AUDIENCE,
      }) as typeof saved;
    } catch {
      return fail(res, 'missing or expired state cookie');
    }
    const { code, state } = req.query;
    if (typeof code !== 'string' || typeof state !== 'string' || state !== saved.state) return fail(res, 'state mismatch');

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.GOOGLE_CLIENT_ID!,
        client_secret: config.GOOGLE_CLIENT_SECRET!,
        redirect_uri: config.googleCallbackUrl,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenRes.ok) return fail(res, `token exchange ${tokenRes.status}`);
    const { access_token } = (await tokenRes.json()) as { access_token?: string };
    if (!access_token) return fail(res, 'no access token');

    const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!profileRes.ok) return fail(res, `userinfo ${profileRes.status}`);
    const profile = (await profileRes.json()) as GoogleProfile;
    // Only trust verified emails, otherwise an attacker could take over an existing account.
    if (!profile.email || profile.email_verified !== true) return fail(res, 'email not verified');
    const email = profile.email.toLowerCase();

    let [user] = await ctx.db.select(authColumns).from(users).where(eq(users.googleId, profile.sub)).limit(1);
    if (!user) {
      [user] = await ctx.db.select(authColumns).from(users).where(eq(users.email, email)).limit(1);
      if (user) {
        await ctx.db.update(users).set({ googleId: profile.sub, updatedAt: new Date() }).where(eq(users.id, user.id));
      } else {
        const name = profile.name?.slice(0, 100) || email.split('@')[0]!;
        [user] = await ctx.db
          .insert(users)
          .values({
            email,
            name,
            googleId: profile.sub,
            avatarUrl: profile.picture ?? null,
            handle: await generateHandle(ctx.db, name, email),
          })
          .returning(authColumns);
      }
    }
    if (!user) return fail(res, 'user upsert failed');
    if (user.status === 'blocked') return fail(res, 'blocked user');

    res.clearCookie(STATE_COOKIE, cookieOptions(ctx));
    issueSession(ctx, res, user);
    res.redirect(302, `${config.FRONTEND_URL}${safeNextPath(saved.next)}`);
  });

  return router;
}
