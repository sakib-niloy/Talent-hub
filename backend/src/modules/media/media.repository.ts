// All media read queries live here. Lists return author + counts + likedByMe in ONE query
// (no per-card follow-up requests), using keyset pagination on (created_at, id).
import { and, desc, eq, inArray, lt, sql, type SQL } from 'drizzle-orm';
import type { Db } from '../../lib/db.js';
import { follows, likes, media, users, type MediaKind } from '../../db/schema.js';
import type { Cursor } from '../../lib/pagination.js';
import { publicUserColumns } from '../users/dto.js';

export interface ListFilter {
  viewerId?: number;
  kind?: MediaKind;
  authorId?: number;
  followingOf?: number;
  cursor?: Cursor;
  limit: number;
}

const selection = (viewerId?: number) => ({
  id: media.id,
  userId: media.userId,
  kind: media.kind,
  status: media.status,
  title: media.title,
  description: media.description,
  storageKey: media.storageKey,
  mimeType: media.mimeType,
  sizeBytes: media.sizeBytes,
  likeCount: media.likeCount,
  commentCount: media.commentCount,
  createdAt: media.createdAt,
  author: publicUserColumns,
  likedByMe: viewerId
    ? sql<boolean>`exists (select 1 from ${likes} where ${likes.mediaId} = ${media.id} and ${likes.userId} = ${viewerId})`.mapWith(Boolean)
    : sql<boolean>`false`.mapWith(Boolean),
});

export type MediaWithAuthor = Awaited<ReturnType<MediaRepository['findById']>> & {};

export class MediaRepository {
  constructor(private readonly db: Db) {}

  async list(f: ListFilter) {
    const where: SQL[] = [eq(media.status, 'ready')];
    if (f.kind) where.push(eq(media.kind, f.kind));
    if (f.authorId) where.push(eq(media.userId, f.authorId));
    if (f.followingOf) {
      where.push(
        inArray(media.userId, this.db.select({ id: follows.followedId }).from(follows).where(eq(follows.followerId, f.followingOf)))
      );
    }
    if (f.cursor) {
      where.push(sql`(${media.createdAt}, ${media.id}) < (${f.cursor.t.toISOString()}::timestamptz, ${f.cursor.id})`);
    }
    return this.db
      .select(selection(f.viewerId))
      .from(media)
      .innerJoin(users, eq(users.id, media.userId))
      .where(and(...where))
      .orderBy(desc(media.createdAt), desc(media.id))
      .limit(f.limit + 1);
  }

  async findById(id: number, viewerId?: number) {
    const [row] = await this.db
      .select(selection(viewerId))
      .from(media)
      .innerJoin(users, eq(users.id, media.userId))
      .where(eq(media.id, id))
      .limit(1);
    return row;
  }

  async findOwnerRow(id: number) {
    const [row] = await this.db
      .select({ id: media.id, userId: media.userId, status: media.status, kind: media.kind, storageKey: media.storageKey, mimeType: media.mimeType })
      .from(media)
      .where(eq(media.id, id))
      .limit(1);
    return row;
  }

  /** Pending uploads older than the cutoff (abandoned or never completed). */
  async stalePending(olderThan: Date) {
    return this.db
      .select({ id: media.id, storageKey: media.storageKey })
      .from(media)
      .where(and(eq(media.status, 'pending'), lt(media.createdAt, olderThan)))
      .limit(100);
  }
}
