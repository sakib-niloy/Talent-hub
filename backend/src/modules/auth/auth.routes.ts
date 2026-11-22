import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { AppContext } from '../../context.js';
import type { RateLimiters } from '../../middleware/rateLimit.js';
import { users } from '../../db/schema.js';
import { authColumns, clearSession, currentUser, issueSession, requireAuth } from '../../middleware/auth.js';
import { HttpError, conflict, forbidden, parse } from '../../lib/errors.js';
import { generateHandle, isUniqueViolation } from '../../lib/handles.js';
import { toCurrentUser } from '../users/dto.js';
import { googleRoutes } from './google.js';

const BCRYPT_ROUNDS = 11;
// Keeps sign-in timing constant for unknown emails / Google-only accounts (no user enumeration).
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', BCRYPT_ROUNDS);

const email = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Please enter a valid email address' }).max(254));

const signupSchema = z.object({
  name: z.string({ error: 'Name is required' }).trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  email,
  password: z
    .string({ error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

const signinSchema = z.object({
  email,
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required').max(128),
});

export function authRoutes(ctx: AppContext, limiters: RateLimiters): Router {
  const router = Router();
  const { db } = ctx;

  router.post('/signup', limiters.auth, async (req, res) => {
    const input = parse(signupSchema, req.body);
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
    if (existing) throw conflict('An account with this email already exists');

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    let created;
    try {
      [created] = await db
        .insert(users)
        .values({ email: input.email, name: input.name, passwordHash, handle: await generateHandle(db, input.name, input.email) })
        .returning(authColumns);
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict('An account with this email already exists');
      throw err;
    }
    if (!created) throw new HttpError(500, 'Could not create account');
    issueSession(ctx, res, created);
    ctx.logger.info({ userId: created.id }, 'user signed up');
    res.status(201).json({ data: { user: toCurrentUser(created) } });
  });

  router.post('/signin', limiters.auth, async (req, res) => {
    const input = parse(signinSchema, req.body);
    const [user] = await db
      .select({ ...authColumns, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !user.passwordHash || !ok) throw new HttpError(401, 'Invalid email or password');
    if (user.status === 'blocked') throw forbidden('This account has been blocked');
    issueSession(ctx, res, user);
    const { passwordHash: _omit, ...safe } = user;
    res.json({ data: { user: toCurrentUser(safe) } });
  });

  router.post('/signout', (_req, res) => {
    clearSession(ctx, res);
    res.status(204).end();
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({ data: { user: toCurrentUser(currentUser(req)) } });
  });

  router.get('/providers', (_req, res) => {
    res.json({ data: { google: ctx.config.googleOAuthEnabled } });
  });

  router.use('/google', limiters.auth, googleRoutes(ctx));

  return router;
}
