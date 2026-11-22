// Opaque keyset-pagination cursors: base64url("<iso timestamp>|<id>").
import { z } from 'zod';
import { badRequest } from './errors.js';

export interface Cursor {
  t: Date;
  id: number;
}

export const encodeCursor = (t: Date, id: number) => Buffer.from(`${t.toISOString()}|${id}`).toString('base64url');

export function decodeCursor(raw: string | undefined): Cursor | undefined {
  if (!raw) return undefined;
  const [iso, id] = Buffer.from(raw, 'base64url').toString('utf8').split('|');
  const t = new Date(iso ?? '');
  const n = Number(id);
  if (Number.isNaN(t.getTime()) || !Number.isInteger(n)) throw badRequest('Invalid cursor');
  return { t, id: n };
}

export const pageQuery = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** Given limit+1 rows, return the page and the next cursor. */
export function paginate<T>(rows: T[], limit: number, key: (row: T) => { t: Date; id: number }) {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const k = hasMore && last ? key(last) : undefined;
  return { page, nextCursor: k ? encodeCursor(k.t, k.id) : null };
}
