// One-off migration of the legacy MySQL data into the new Postgres schema + storage.
//
//   npm run import:legacy -- <path/to/talent_hub.sql> <path/to/legacy/uploads>
//
// - Users keep their passwords (bcrypt hashes are compatible) and get a generated handle.
// - photos/audios/videos -> media (files are copied into the configured storage: local or R2).
// - comments/likes/follows are remapped to the new ids; counters are recomputed.
// - Idempotent for users (matched by email). Files that fail the magic-byte check are skipped.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { loadConfig } from '../src/config/env.js';
import { createDatabase } from '../src/lib/db.js';
import { createStorage } from '../src/lib/storage/index.js';
import { comments, follows, likes, media, users, type MediaKind } from '../src/db/schema.js';
import { MEDIA_SPECS, matchesDeclaredType, SNIFF_BYTES } from '../src/lib/media-types.js';
import { generateHandle } from '../src/lib/handles.js';

type Value = string | number | null;

/** Parse `INSERT INTO `table` (cols) VALUES (...),(...);` statements from a MySQL dump. */
export function parseInserts(dump: string): Map<string, Record<string, Value>[]> {
  const tables = new Map<string, Record<string, Value>[]>();
  const re = /INSERT INTO `(\w+)` \(([^)]+)\) VALUES\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(dump))) {
    const table = m[1]!;
    const cols = m[2]!.split(',').map((c) => c.trim().replace(/`/g, ''));
    let i = re.lastIndex;
    const rows = tables.get(table) ?? [];
    // tokenize tuples until the terminating ';'
    while (i < dump.length) {
      while (/\s|,/.test(dump[i]!)) i++;
      if (dump[i] === ';') break;
      if (dump[i] !== '(') throw new Error(`Unexpected token in ${table} at ${i}`);
      i++;
      const values: Value[] = [];
      while (dump[i] !== ')') {
        while (dump[i] === ' ' || dump[i] === ',') i++;
        if (dump[i] === "'") {
          let s = '';
          i++;
          while (i < dump.length) {
            const ch = dump[i]!;
            if (ch === '\\') {
              const next = dump[i + 1]!;
              s += next === 'n' ? '\n' : next === 'r' ? '\r' : next === 't' ? '\t' : next === '0' ? '\0' : next;
              i += 2;
            } else if (ch === "'" && dump[i + 1] === "'") {
              s += "'";
              i += 2;
            } else if (ch === "'") {
              i++;
              break;
            } else {
              s += ch;
              i++;
            }
          }
          values.push(s);
        } else {
          let tok = '';
          while (dump[i] !== ',' && dump[i] !== ')') tok += dump[i++];
          tok = tok.trim();
          values.push(tok.toUpperCase() === 'NULL' ? null : Number(tok));
        }
        while (dump[i] === ' ') i++;
      }
      i++; // ')'
      rows.push(Object.fromEntries(cols.map((c, idx) => [c, values[idx] ?? null])));
    }
    tables.set(table, rows);
    re.lastIndex = i;
  }
  return tables;
}

const EXT_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.flac': 'audio/flac', '.aac': 'audio/aac',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.ogv': 'video/ogg',
};

async function main() {
  const [dumpPath, uploadsDir] = process.argv.slice(2);
  if (!dumpPath || !uploadsDir) {
    console.error('Usage: npm run import:legacy -- <talent_hub.sql> <legacy uploads dir>');
    process.exit(1);
  }
  const config = loadConfig();
  const database = await createDatabase({ url: config.DATABASE_URL, pgliteDir: config.PGLITE_DIR });
  await database.migrate();
  const { db } = database;
  const storage = createStorage(config);
  const data = parseInserts(fs.readFileSync(dumpPath, 'utf8'));
  const userMap = new Map<number, number>();
  const mediaMap = new Map<string, number>(); // "photo:1" -> new id

  for (const u of data.get('users') ?? []) {
    const email = String(u.email).trim().toLowerCase();
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      userMap.set(Number(u.id), existing.id);
      continue;
    }
    const name = String(u.name || email.split('@')[0]);
    const [created] = await db
      .insert(users)
      .values({
        email,
        name,
        passwordHash: u.password ? String(u.password) : null,
        handle: await generateHandle(db, name, email),
        role: Number(u.is_admin) === 1 ? 'admin' : 'user',
        createdAt: u.created_at ? new Date(`${u.created_at}Z`) : undefined,
      })
      .returning({ id: users.id });
    userMap.set(Number(u.id), created!.id);
  }
  console.log(`users: ${userMap.size}`);

  const kinds: [string, MediaKind, string][] = [['photos', 'photo', 'photo_url'], ['audios', 'audio', 'audio_url'], ['videos', 'video', 'video_url']];
  let imported = 0;
  let skipped = 0;
  for (const [table, kind, urlCol] of kinds) {
    for (const row of data.get(table) ?? []) {
      const ownerId = userMap.get(Number(row.user_id));
      const legacyUrl = String(row[urlCol] ?? '');
      const file = path.join(uploadsDir, legacyUrl.replace(/^\/?uploads\//, ''));
      const ext = path.extname(file).toLowerCase();
      const mimeType = EXT_MIME[ext];
      const type = mimeType ? MEDIA_SPECS[kind].types[mimeType] : undefined;
      if (!ownerId || !type || !fs.existsSync(file)) {
        console.warn(`skip ${table}#${row.id}: ${!ownerId ? 'no owner' : !type ? `unsupported ${ext}` : 'file missing'}`);
        skipped++;
        continue;
      }
      const body = fs.readFileSync(file);
      if (body.length > MEDIA_SPECS[kind].maxBytes || !matchesDeclaredType(kind, mimeType!, body.subarray(0, SNIFF_BYTES))) {
        console.warn(`skip ${table}#${row.id}: failed size/content check`);
        skipped++;
        continue;
      }
      const storageKey = `${kind}/${ownerId}/${Date.now()}-${crypto.randomUUID()}${type.ext}`;
      await storage.put(storageKey, body, mimeType!);
      const [m] = await db
        .insert(media)
        .values({
          userId: ownerId,
          kind,
          status: 'ready',
          title: String(row.title || 'Untitled').slice(0, 120),
          description: row.description ? String(row.description).slice(0, 2000) : null,
          storageKey,
          mimeType: mimeType!,
          sizeBytes: body.length,
          createdAt: row.created_at ? new Date(`${row.created_at}Z`) : undefined,
        })
        .returning({ id: media.id });
      mediaMap.set(`${kind}:${row.id}`, m!.id);
      imported++;
    }
  }
  console.log(`media: ${imported} imported, ${skipped} skipped`);

  for (const c of data.get('comments') ?? []) {
    const mediaId = mediaMap.get(`${c.content_type}:${c.content_id}`);
    const userId = userMap.get(Number(c.user_id));
    if (mediaId && userId && c.comment) {
      await db.insert(comments).values({ mediaId, userId, body: String(c.comment).slice(0, 2000) });
    }
  }
  for (const l of data.get('likes') ?? []) {
    const mediaId = mediaMap.get(`${l.content_type}:${l.content_id}`);
    const userId = userMap.get(Number(l.user_id));
    if (mediaId && userId) await db.insert(likes).values({ mediaId, userId }).onConflictDoNothing();
  }
  for (const f of data.get('follows') ?? []) {
    const followerId = userMap.get(Number(f.follower_id));
    const followedId = userMap.get(Number(f.followed_id));
    if (followerId && followedId && followerId !== followedId) {
      await db.insert(follows).values({ followerId, followedId }).onConflictDoNothing();
    }
  }
  // Recompute denormalised counters from the source of truth.
  await db.execute(sql`update media set
    like_count = (select count(*) from likes where likes.media_id = media.id),
    comment_count = (select count(*) from comments where comments.media_id = media.id)`);
  console.log('done.');
  await database.close();
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('import-legacy-dump.ts')) {
  await main();
}
