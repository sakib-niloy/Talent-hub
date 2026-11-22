// Database factory: node-postgres (Neon/any Postgres) when DATABASE_URL is set,
// otherwise embedded PGlite (local dev + tests, no install needed).
import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from '../db/schema.js';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface Database {
  db: Db;
  driver: 'postgres' | 'pglite';
  migrate(): Promise<void>;
  ping(): Promise<void>;
  close(): Promise<void>;
}

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../../drizzle');

export async function createDatabase(opts: { url?: string; pgliteDir?: string }): Promise<Database> {
  if (opts.url) {
    const { default: pg } = await import('pg');
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    const pool = new pg.Pool({
      connectionString: opts.url,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000, // Neon may need a moment to wake from scale-to-zero
    });
    const db = drizzle({ client: pool, schema, casing: 'snake_case' }) as unknown as Db;
    return {
      db,
      driver: 'postgres',
      migrate: () => migrate(db as never, { migrationsFolder: MIGRATIONS_DIR }),
      ping: async () => void (await db.execute(sql`select 1`)),
      close: () => pool.end(),
    };
  }

  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const dir = opts.pgliteDir ?? 'memory://';
  if (!dir.startsWith('memory://')) fs.mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle({ client, schema, casing: 'snake_case' }) as unknown as Db;
  return {
    db,
    driver: 'pglite',
    migrate: () => migrate(db as never, { migrationsFolder: MIGRATIONS_DIR }),
    ping: async () => void (await db.execute(sql`select 1`)),
    close: () => client.close(),
  };
}
