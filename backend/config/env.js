// Centralised, validated configuration.
// Loads backend/.env (if present) and fails fast on missing or weak secrets,
// so a misconfigured deploy never starts with insecure fallbacks.
const path = require('path');
const { z } = require('zod');

const ENV_FILE = path.join(__dirname, '..', '.env');
try {
  // Native .env loader (Node >= 20.12). Real environment variables take precedence.
  process.loadEnvFile(ENV_FILE);
} catch (err) {
  if (err.code !== 'ENOENT') throw err; // no .env file is fine (e.g. on Render)
}

const PLACEHOLDER = /^(your[_-]|change[_-]?me|dummy)/i;
const optionalSecret = z
  .string()
  .optional()
  .transform((v) => (v && !PLACEHOLDER.test(v) ? v : undefined));

const csv = (fallback) =>
  z
    .string()
    .default(fallback)
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean));

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),

    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().positive().default(3306),
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string().default(''),
    DB_NAME: z.string().min(1),

    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters (use a random 64-byte hex string)'),
    JWT_EXPIRES_IN: z.string().default('1h'),
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

    CORS_ORIGINS: csv('http://localhost:3000,http://localhost:3001'),
    // Number of reverse proxies in front of the app (1 on Render/Heroku, 0 locally).
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),

    GOOGLE_CLIENT_ID: optionalSecret,
    GOOGLE_CLIENT_SECRET: optionalSecret,
    GOOGLE_CALLBACK_URL: z.string().default('/auth/google/callback'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && !env.DB_PASSWORD) {
      ctx.addIssue({ code: 'custom', path: ['DB_PASSWORD'], message: 'DB_PASSWORD is required in production' });
    }
    if (env.JWT_SECRET === env.SESSION_SECRET) {
      ctx.addIssue({ code: 'custom', path: ['SESSION_SECRET'], message: 'SESSION_SECRET must differ from JWT_SECRET' });
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  console.error('See backend/.env.example for the required variables.');
  process.exit(1);
}

const env = parsed.data;

module.exports = Object.freeze({
  ...env,
  isProduction: env.NODE_ENV === 'production',
  googleOAuthEnabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
});
