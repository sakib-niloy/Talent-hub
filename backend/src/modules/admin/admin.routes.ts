import { Router } from 'express';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AppContext } from '../../context.js';
import { comments, likes, media, roleEnum, userStatusEnum, users } from '../../db/schema.js';
import { authColumns, currentUser, requireAdmin } from '../../middleware/auth.js';
import { badRequest, notFound, parse } from '../../lib/errors.js';
import { decodeCursor, pageQuery, paginate } from '../../lib/pagination.js';
import { toCurrentUser } from '../users/dto.js';
import type { MediaService } from '../media/media.service.js';

const idParams = z.object({ id: z.coerce.number().int().positive() });
const patchUser = z
  .object({ status: z.enum(userStatusEnum.enumValues).optional(), role: z.enum(roleEnum.enumValues).optional() })
  .refine((v) => v.status || v.role, 'Nothing to update');

export function adminRoutes(ctx: AppContext, mediaService: MediaService): Router {
  const router = Router();
  const { db } = ctx;
  router.use(requireAdmin);

  const adminSelect = {
    ...authColumns,
    // Explicitly qualified: drizzle renders bare column names in single-table selects.
    mediaCount: sql<number>`(select count(*)::int from ${media} where ${media.userId} = "users"."id")`,
  };
  const toAdminUser = (u: Awaited<ReturnType<typeof loadUser>>) => ({
    ...toCurrentUser(u),
    status: u.status,
    mediaCount: u.mediaCount,
  });
  const loadUser = async (id: number) => {
    const [u] = await db.select(adminSelect).from(users).where(eq(users.id, id)).limit(1);
    if (!u) throw notFound('User not found');
    return u;
  };

  router.get('/stats', async (_req, res) => {
    const count = async (table: typeof users | typeof media | typeof comments | typeof likes) => {
      const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(table);
      return r?.n ?? 0;
    };
    const [u, m, c, l] = await Promise.all([count(users), count(media), count(comments), count(likes)]);
    res.json({ data: { users: u, media: m, comments: c, likes: l } });
  });

  router.get('/users', async (req, res) => {
    const { q, cursor: raw, limit } = parse(pageQuery.extend({ q: z.string().trim().max(100).optional() }), req.query);
    const cursor = decodeCursor(raw);
    const term = q ? `%${q.replace(/[%_\\]/g, (ch) => `\\${ch}`)}%` : undefined;
    const rows = await db
      .select(adminSelect)
      .from(users)
      .where(
        and(
          term ? or(ilike(users.name, term), ilike(users.email, term), ilike(users.handle, term)) : undefined,
          cursor ? sql`(${users.createdAt}, ${users.id}) < (${cursor.t.toISOString()}::timestamptz, ${cursor.id})` : undefined
        )
      )
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(limit + 1);
    const { page, nextCursor } = paginate(rows, limit, (r) => ({ t: r.createdAt, id: r.id }));
    res.json({ data: page.map(toAdminUser), meta: { nextCursor } });
  });

  router.patch('/users/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    const input = parse(patchUser, req.body);
    if (id === currentUser(req).id) throw badRequest('You cannot change your own role or status');
    await loadUser(id);
    await db
      .update(users)
      .set({
        ...input,
        // Blocking revokes every existing session immediately.
        ...(input.status === 'blocked' ? { tokenVersion: sql`${users.tokenVersion} + 1` } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
    if (input.status === 'blocked') ctx.events.emit('user.blocked', { userId: id });
    res.json({ data: toAdminUser(await loadUser(id)) });
  });

  router.delete('/media/:id', async (req, res) => {
    const { id } = parse(idParams, req.params);
    await mediaService.remove(currentUser(req), id);
    res.status(204).end();
  });

  return router;
}
