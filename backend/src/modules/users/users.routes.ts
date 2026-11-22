import { Router } from 'express';
import { and, desc, eq, ne, notInArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AppContext } from '../../context.js';
import { follows, media, users } from '../../db/schema.js';
import { authColumns, currentUser, requireAuth } from '../../middleware/auth.js';
import { badRequest, notFound, parse } from '../../lib/errors.js';
import { decodeCursor, pageQuery, paginate } from '../../lib/pagination.js';
import { publicUserColumns, toCurrentUser } from './dto.js';

const handleParams = z.object({ handle: z.string().trim().toLowerCase().min(1).max(40) });
const updateMe = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters').optional(),
    bio: z.string().trim().max(300, 'Bio must be at most 300 characters').nullish(),
  })
  .refine((v) => v.name !== undefined || v.bio !== undefined, 'Nothing to update');

export function userRoutes(ctx: AppContext): Router {
  const router = Router();
  const { db } = ctx;

  const findByHandle = async (handle: string) => {
    const [u] = await db.select({ ...publicUserColumns, createdAt: users.createdAt }).from(users).where(eq(users.handle, handle)).limit(1);
    if (!u) throw notFound('User not found');
    return u;
  };

  const followerCount = async (userId: number) => {
    const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(follows).where(eq(follows.followedId, userId));
    return r?.n ?? 0;
  };

  router.get('/suggestions', async (req, res) => {
    const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(20).default(5) }), req.query);
    const viewer = req.user;
    const conditions = [eq(users.status, 'active')];
    if (viewer) {
      conditions.push(ne(users.id, viewer.id));
      conditions.push(notInArray(users.id, db.select({ id: follows.followedId }).from(follows).where(eq(follows.followerId, viewer.id))));
    }
    const rows = await db
      .select(publicUserColumns)
      .from(users)
      .where(and(...conditions))
      .orderBy(
        // Explicitly qualified: drizzle renders bare column names in single-table selects.
        desc(sql`(select count(*) from ${follows} f where f.followed_id = "users"."id")`),
        desc(users.createdAt)
      )
      .limit(limit);
    res.json({ data: rows });
  });

  router.patch('/me', requireAuth, async (req, res) => {
    const input = parse(updateMe, req.body);
    const [updated] = await db
      .update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(users.id, currentUser(req).id))
      .returning(authColumns);
    res.json({ data: { user: toCurrentUser(updated!) } });
  });

  router.get('/:handle', async (req, res) => {
    const { handle } = parse(handleParams, req.params);
    const u = await findByHandle(handle);
    const viewerId = req.user?.id;
    const [stats] = await db
      .select({
        followerCount: sql<number>`(select count(*)::int from ${follows} where ${follows.followedId} = ${u.id})`,
        followingCount: sql<number>`(select count(*)::int from ${follows} where ${follows.followerId} = ${u.id})`,
        mediaCount: sql<number>`(select count(*)::int from ${media} where ${media.userId} = ${u.id} and ${media.status} = 'ready')`,
        isFollowing: viewerId
          ? sql<boolean>`exists (select 1 from ${follows} where ${follows.followerId} = ${viewerId} and ${follows.followedId} = ${u.id})`.mapWith(Boolean)
          : sql<boolean>`false`.mapWith(Boolean),
      })
      .from(users)
      .where(eq(users.id, u.id));
    res.json({ data: { ...u, createdAt: u.createdAt.toISOString(), ...stats, isMe: viewerId === u.id } });
  });

  const listConnections = (direction: 'followers' | 'following') =>
    router.get(`/:handle/${direction}`, async (req, res) => {
      const { handle } = parse(handleParams, req.params);
      const { cursor: rawCursor, limit } = parse(pageQuery, req.query);
      const u = await findByHandle(handle);
      const cursor = decodeCursor(rawCursor);
      // followers: rows where followed = u, list the follower; following: the reverse.
      const self = direction === 'followers' ? follows.followedId : follows.followerId;
      const other = direction === 'followers' ? follows.followerId : follows.followedId;
      const rows = await db
        .select({ ...publicUserColumns, followedAt: follows.createdAt })
        .from(follows)
        .innerJoin(users, eq(users.id, other))
        .where(
          and(
            eq(self, u.id),
            cursor ? sql`(${follows.createdAt}, ${other}) < (${cursor.t.toISOString()}::timestamptz, ${cursor.id})` : undefined
          )
        )
        .orderBy(desc(follows.createdAt), desc(other))
        .limit(limit + 1);
      const { page, nextCursor } = paginate(rows, limit, (r) => ({ t: r.followedAt, id: r.id }));
      res.json({ data: page.map(({ followedAt: _f, ...user }) => user), meta: { nextCursor } });
    });
  listConnections('followers');
  listConnections('following');

  router.post('/:handle/follow', requireAuth, async (req, res) => {
    const { handle } = parse(handleParams, req.params);
    const target = await findByHandle(handle);
    const me = currentUser(req);
    if (target.id === me.id) throw badRequest('You cannot follow yourself');
    await db.insert(follows).values({ followerId: me.id, followedId: target.id }).onConflictDoNothing();
    res.json({ data: { isFollowing: true, followerCount: await followerCount(target.id) } });
  });

  router.delete('/:handle/follow', requireAuth, async (req, res) => {
    const { handle } = parse(handleParams, req.params);
    const target = await findByHandle(handle);
    await db.delete(follows).where(and(eq(follows.followerId, currentUser(req).id), eq(follows.followedId, target.id)));
    res.json({ data: { isFollowing: false, followerCount: await followerCount(target.id) } });
  });

  return router;
}
