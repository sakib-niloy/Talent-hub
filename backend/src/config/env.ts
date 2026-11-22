// Centralised, validated configuration. Fails fast on missing/weak settings so a
// misconfigured deploy never starts with insecure fallbacks.
import { z } from 'zod';

const PLACEHOLDER = /^(your[_-]|change[_-]?me|dummy)/i;
const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() && !PLACEHOLDER.test(v) ? v.trim() : undefined));

const csv = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((v) => v.split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean));

const bool = (fallback: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v === undefined ? fallback : v === 'true' || v === '1'));

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

    // Postgres connection string (Neon in production). When unset outside production,
    // an embedded Postgres (PGlite) stored in PGLITE_DIR is used — zero setup locally.
    DATABASE_URL: optional,
    PGLITE_DIR: z.string().default('./.data/pglite'),
    RUN_MIGRATIONS: bool(true),

    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters (random 64-byte hex recommended)'),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),

    // Public URL of the web app; OAuth redirects land here. The API is reached through its /api proxy.
    FRONTEND_URL: z.string().url().default('http://localhost:3000').transform((v) => v.replace(/\/+$/, '')),
    // Browser origins allowed to call the API directly (CORS) and to send mutating requests (CSRF check).
    CORS_ORIGINS: csv('http://localhost:3000,http://localhost:3001'),
    // Number of reverse proxies in front of the app (Vercel rewrite + Render = 2).
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),

    RATE_LIMIT_AUTH: z.coerce.number().int().positive().default(10), // failed attempts / 15 min
    RATE_LIMIT_API: z.coerce.number().int().positive().default(600), // requests / 15 min
    RATE_LIMIT_UPLOAD: z.coerce.number().int().positive().default(30), // new uploads / hour

    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,
    GOOGLE_CALLBACK_URL: optional, // default: `${FRONTEND_URL}/api/v1/auth/google/callback`

    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    LOCAL_UPLOAD_DIR: z.string().default('./uploads'),
    // S3-compatible object storage (Cloudflare R2, Supabase Storage, Backblaze B2, AWS S3)
    S3_ENDPOINT: optional,
    S3_REGION: z.string().default('auto'),
    S3_BUCKET: optional,
    S3_ACCESS_KEY_ID: optional,
    S3_SECRET_ACCESS_KEY: optional,
    S3_PUBLIC_URL: optional, // public base URL of the bucket (r2.dev / custom domain)
    S3_FORCE_PATH_STYLE: bool(true),
  })
  .superRefine((env, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
    if (env.NODE_ENV === 'production') {
      if (!env.DATABASE_URL) issue('DATABASE_URL', 'DATABASE_URL is required in production');
      if (env.STORAGE_DRIVER !== 's3') issue('STORAGE_DRIVER', 'STORAGE_DRIVER must be "s3" in production (local disk is ephemeral)');
    }
    if (env.STORAGE_DRIVER === 's3') {
      for (const key of ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_PUBLIC_URL'] as const) {
        if (!env[key]) issue(key, `${key} is required when STORAGE_DRIVER=s3`);
      }
    }
  });

export type Config = ReturnType<typeof loadConfig>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env) {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}\nSee backend/.env.example.`);
  }
  const env = parsed.data;
  return Object.freeze({
    ...env,
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    googleOAuthEnabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    googleCallbackUrl: env.GOOGLE_CALLBACK_URL ?? `${env.FRONTEND_URL}/api/v1/auth/google/callback`,
    cookieName: 'th_session',
  });
}
