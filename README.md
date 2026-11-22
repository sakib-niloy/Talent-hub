# TalentHub

A community platform for creators to share **photos, music and videos**, follow each other, and like and comment on work.

| | Stack |
|---|---|
| **Web** (`frontend/`) | Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · shadcn/ui · TanStack Query |
| **API** (`backend/`) | Node 22 · Express 5 · TypeScript · Drizzle ORM · PostgreSQL (Neon) · Zod · Pino |
| **Media** | S3-compatible object storage (Cloudflare R2) with direct browser uploads using signed URLs |
| **Hosting** | Vercel (web) + Render (API) + Neon (DB) + R2 (media): all on free tiers |

## Quick start (local)

```bash
# API: uses an embedded Postgres (PGlite), so no database install is needed
cd backend
cp .env.example .env         # set JWT_SECRET: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
npm ci
npm run dev                  # http://localhost:5000  (health: /healthz)

# Web (new terminal)
cd frontend
cp .env.example .env.local   # API_ORIGIN=http://localhost:5000
npm ci
npm run dev                  # http://localhost:3000
```

Make yourself an admin after signing up: `cd backend && npm run make-admin -- you@example.com`.

## Scripts

| Where | Command | What it does |
|---|---|---|
| backend | `npm test` | Integration tests (in-memory Postgres) |
| backend | `npm run typecheck` / `npm run build` | Type-check / compile to `dist/` |
| backend | `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| backend | `npm run import:legacy -- <dump.sql> <uploads dir>` | Import data from the legacy MySQL version |
| frontend | `npm run lint` / `npm run build` | Lint / production build |

## Docs

- [`docs/API.md`](docs/API.md): the REST API contract (v1)
- [`DEPLOY.md`](DEPLOY.md): step-by-step free deployment and rollback
- [`MODERNIZATION_PLAN.md`](MODERNIZATION_PLAN.md): architecture decisions and the modernization log

## Security

httpOnly `SameSite=Lax` cookie sessions with immediate revocation, a CSRF origin guard, strict security headers, rate limiting, Zod validation on every input, uploads restricted by MIME type and verified by magic bytes, RFC 9457 errors with no internal details, and secrets validated at startup. CI runs gitleaks, tests and `npm audit`.
