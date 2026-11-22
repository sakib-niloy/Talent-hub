import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema.js';
import type { Db } from './db.js';

const RESERVED = new Set(['me', 'admin', 'api', 'settings', 'upload', 'feed', 'signin', 'signup', 'explore', 'suggestions']);

export function slugify(input: string): string {
  const slug = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20)
    .replace(/-+$/g, '');
  return slug.length >= 2 ? slug : `user${slug}`;
}

/** A unique, URL-safe handle derived from the user's name (falls back to a random suffix). */
export async function generateHandle(db: Db, name: string, email: string): Promise<string> {
  const base = slugify(name || email.split('@')[0] || 'user');
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = attempt === 0 && !RESERVED.has(base) ? base : `${base}-${crypto.randomBytes(2).toString('hex')}`;
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.handle, candidate)).limit(1);
    if (!taken) return candidate;
  }
  return `${base}-${crypto.randomBytes(4).toString('hex')}`;
}

export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === '23505' || e?.cause?.code === '23505';
}
