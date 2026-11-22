import crypto from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { AppContext } from '../../context.js';
import { comments, likes, media, users, type MediaKind } from '../../db/schema.js';
import { badRequest, forbidden, HttpError, notFound, unprocessable } from '../../lib/errors.js';
import { MEDIA_SPECS, SNIFF_BYTES, matchesDeclaredType } from '../../lib/media-types.js';
import { decodeCursor, encodeCursor, paginate } from '../../lib/pagination.js';
import type { AuthUser } from '../../types/express.js';
import { publicUserColumns } from '../users/dto.js';
import { MediaRepository, type ListFilter } from './media.repository.js';

const UPLOAD_URL_TTL_SECONDS = 15 * 60;

type MediaRow = NonNullable<Awaited<ReturnType<MediaRepository['findById']>>>;

export class MediaService {
  readonly repo: MediaRepository;

  constructor(private readonly ctx: AppContext) {
    this.repo = new MediaRepository(ctx.db);
  }

  toDto(row: MediaRow) {
    return {
      id: row.id,
      kind: row.kind,
      title: row.title,
      description: row.description,
      url: this.ctx.storage.publicUrl(row.storageKey),
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      createdAt: row.createdAt.toISOString(),
      author: row.author,
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      likedByMe: row.likedByMe,
    };
  }

  async list(q: { kind?: MediaKind; author?: string; feed?: 'following'; cursor?: string; limit: number }, viewer?: AuthUser) {
    const filter: ListFilter = { viewerId: viewer?.id, kind: q.kind, cursor: decodeCursor(q.cursor), limit: q.limit };
    if (q.author) {
      const [author] = await this.ctx.db.select({ id: users.id }).from(users).where(eq(users.handle, q.author.toLowerCase())).limit(1);
      if (!author) return { data: [], nextCursor: null };
      filter.authorId = author.id;
    }
    if (q.feed === 'following') {
      if (!viewer) throw new HttpError(401, 'Sign in to see your following feed');
      filter.followingOf = viewer.id;
    }
    const rows = await this.repo.list(filter);
    const { page, nextCursor } = paginate(rows, q.limit, (r) => ({ t: r.createdAt, id: r.id }));
    return { data: page.map((r) => this.toDto(r)), nextCursor };
  }

  async get(id: number, viewer?: AuthUser) {
    const row = await this.repo.findById(id, viewer?.id);
    if (!row || (row.status !== 'ready' && row.userId !== viewer?.id)) throw notFound('Media not found');
    return this.toDto(row);
  }

  async createUpload(user: AuthUser, input: { kind: MediaKind; title: string; description?: string | null; mimeType: string; sizeBytes: number }) {
    const spec = MEDIA_SPECS[input.kind];
    const type = spec.types[input.mimeType];
    if (!type) {
      throw new HttpError(415, `Unsupported ${input.kind} type "${input.mimeType}". Allowed: ${Object.keys(spec.types).join(', ')}`);
    }
    if (input.sizeBytes > spec.maxBytes) {
      throw new HttpError(413, `${input.kind} files must be at most ${Math.round(spec.maxBytes / 1024 / 1024)} MB`);
    }
    const storageKey = `${input.kind}/${user.id}/${Date.now()}-${crypto.randomUUID()}${type.ext}`;
    const [row] = await this.ctx.db
      .insert(media)
      .values({
        userId: user.id,
        kind: input.kind,
        title: input.title,
        description: input.description || null,
        storageKey,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
      })
      .returning({ id: media.id });
    const upload = await this.ctx.storage.createUpload(storageKey, {
      contentType: input.mimeType,
      maxBytes: spec.maxBytes,
      expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
    });
    return { mediaId: row!.id, upload, expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000).toISOString() };
  }

  /** Verify the uploaded object (exists, size, magic bytes) and publish it. */
  async complete(user: AuthUser, id: number) {
    const row = await this.repo.findOwnerRow(id);
    if (!row) throw notFound('Media not found');
    if (row.userId !== user.id) throw forbidden();
    if (row.status === 'ready') return this.get(id, user);

    const reject = async (reason: string): Promise<never> => {
      await this.ctx.storage.delete(row.storageKey).catch(() => undefined);
      await this.ctx.db.delete(media).where(eq(media.id, id));
      throw unprocessable(reason);
    };

    const stored = await this.ctx.storage.head(row.storageKey);
    if (!stored || stored.size === 0) throw badRequest('The file has not been uploaded yet');
    if (stored.size > MEDIA_SPECS[row.kind].maxBytes) await reject('File is larger than allowed');
    const head = await this.ctx.storage.readStart(row.storageKey, SNIFF_BYTES);
    if (!matchesDeclaredType(row.kind, row.mimeType, head)) {
      await reject(`The file content does not look like a valid ${row.mimeType} file`);
    }
    await this.ctx.db
      .update(media)
      .set({ status: 'ready', sizeBytes: stored.size, updatedAt: new Date() })
      .where(eq(media.id, id));
    return this.get(id, user);
  }

  async update(user: AuthUser, id: number, input: { title?: string; description?: string | null }) {
    const row = await this.repo.findOwnerRow(id);
    if (!row) throw notFound('Media not found');
    if (row.userId !== user.id) throw forbidden();
    await this.ctx.db
      .update(media)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(media.id, id));
    return this.get(id, user);
  }

  /** Owner or admin. Likes/comments cascade in the DB; the file is removed via an event. */
  async remove(user: AuthUser, id: number) {
    const row = await this.repo.findOwnerRow(id);
    if (!row) throw notFound('Media not found');
    if (row.userId !== user.id && user.role !== 'admin') throw forbidden();
    await this.ctx.db.delete(media).where(eq(media.id, id));
    this.ctx.events.emit('media.deleted', { mediaId: id, storageKey: row.storageKey });
  }

  private async requireReady(id: number) {
    const row = await this.repo.findOwnerRow(id);
    if (!row || row.status !== 'ready') throw notFound('Media not found');
    return row;
  }

  /** Idempotent like/unlike; the counter is updated atomically in the same transaction. */
  async setLike(user: AuthUser, id: number, liked: boolean) {
    await this.requireReady(id);
    return this.ctx.db.transaction(async (tx) => {
      if (liked) {
        const inserted = await tx.insert(likes).values({ userId: user.id, mediaId: id }).onConflictDoNothing().returning({ mediaId: likes.mediaId });
        if (inserted.length) await tx.update(media).set({ likeCount: sql`${media.likeCount} + 1` }).where(eq(media.id, id));
      } else {
        const removed = await tx
          .delete(likes)
          .where(and(eq(likes.userId, user.id), eq(likes.mediaId, id)))
          .returning({ mediaId: likes.mediaId });
        if (removed.length) {
          await tx.update(media).set({ likeCount: sql`greatest(${media.likeCount} - 1, 0)` }).where(eq(media.id, id));
        }
      }
      const [m] = await tx.select({ likeCount: media.likeCount }).from(media).where(eq(media.id, id));
      return { liked, likeCount: m?.likeCount ?? 0 };
    });
  }

  async listComments(id: number, q: { cursor?: string; limit: number }, viewer?: AuthUser) {
    const owner = await this.requireReady(id);
    const cursor = decodeCursor(q.cursor);
    const rows = await this.ctx.db
      .select({ id: comments.id, mediaId: comments.mediaId, body: comments.body, createdAt: comments.createdAt, author: publicUserColumns })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.userId))
      .where(
        and(
          eq(comments.mediaId, id),
          cursor ? sql`(${comments.createdAt}, ${comments.id}) > (${cursor.t.toISOString()}::timestamptz, ${cursor.id})` : undefined
        )
      )
      .orderBy(comments.createdAt, comments.id)
      .limit(q.limit + 1);
    const { page, nextCursor } = paginate(rows, q.limit, (r) => ({ t: r.createdAt, id: r.id }));
    return {
      data: page.map((c) => this.commentDto(c, owner.userId, viewer)),
      nextCursor,
    };
  }

  commentDto(c: { id: number; mediaId: number; body: string; createdAt: Date; author: { id: number } & Record<string, unknown> }, mediaOwnerId: number, viewer?: AuthUser) {
    return {
      id: c.id,
      mediaId: c.mediaId,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      author: c.author,
      canDelete: Boolean(viewer && (viewer.id === c.author.id || viewer.id === mediaOwnerId || viewer.role === 'admin')),
    };
  }

  async addComment(user: AuthUser, id: number, body: string) {
    const owner = await this.requireReady(id);
    const created = await this.ctx.db.transaction(async (tx) => {
      const [c] = await tx.insert(comments).values({ mediaId: id, userId: user.id, body }).returning();
      await tx.update(media).set({ commentCount: sql`${media.commentCount} + 1` }).where(eq(media.id, id));
      return c!;
    });
    const author = { id: user.id, name: user.name, handle: user.handle, avatarUrl: user.avatarUrl, bio: user.bio };
    return this.commentDto({ ...created, author }, owner.userId, user);
  }

  async deleteComment(user: AuthUser, commentId: number) {
    const [c] = await this.ctx.db
      .select({ id: comments.id, userId: comments.userId, mediaId: comments.mediaId, mediaOwner: media.userId })
      .from(comments)
      .innerJoin(media, eq(media.id, comments.mediaId))
      .where(eq(comments.id, commentId))
      .limit(1);
    if (!c) throw notFound('Comment not found');
    if (c.userId !== user.id && c.mediaOwner !== user.id && user.role !== 'admin') throw forbidden();
    await this.ctx.db.transaction(async (tx) => {
      await tx.delete(comments).where(eq(comments.id, commentId));
      await tx.update(media).set({ commentCount: sql`greatest(${media.commentCount} - 1, 0)` }).where(eq(media.id, c.mediaId));
    });
  }

  /** Remove abandoned pending uploads (and their objects). */
  async sweepPending(maxAgeMs = 2 * 60 * 60 * 1000) {
    const stale = await this.repo.stalePending(new Date(Date.now() - maxAgeMs));
    for (const s of stale) {
      await this.ctx.storage.delete(s.storageKey).catch(() => undefined);
      await this.ctx.db.delete(media).where(eq(media.id, s.id));
    }
    return stale.length;
  }
}

export { encodeCursor };
