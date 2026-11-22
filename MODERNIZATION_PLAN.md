# TalentHub Modernization Plan

> **Status (2026-11-22):** Phases 1–3 are **executed** on branch `modernization`. Phase 4 has its config and runbook done; go-live needs the account steps in [`DEPLOY.md`](DEPLOY.md).
>
> **Decisions taken** (Appendix B): PostgreSQL on Neon (via Drizzle) · own cookie-based auth · Next.js + Tailwind + shadcn · Cloudflare R2 (generic S3 driver, so Supabase Storage works too) · TypeScript everywhere · git history purged locally (force-push pending).
>
> **Deviations from the original plan:**
> - **No monorepo:** kept the `backend/` + `frontend/` folders instead of pnpm workspaces. They deploy independently, so there's less churn.
> - **Drizzle, not Prisma:** no engine binaries, and the same code runs on Neon (`pg`) and embedded PGlite (local dev and tests, with zero installs).
> - **One 7-day session cookie, revocable on every request:** instead of access + refresh tokens. The user's status and `token_version` are checked on each request.
> - **Google OAuth without Passport:** implemented directly against Google's endpoints, so `express-session` is gone.
> - **API proxied through the frontend domain:** `/api/*` goes through Vercel rewrites, so cookies are first-party.
> - **Not done yet:**
>   - The OpenAPI spec is the hand-written `docs/API.md` (no generated spec or typed client yet).
>   - No Sentry.
>   - Server-side Open Graph metadata for media and profiles.
>   - Avatar upload.
> **Author role:** Principal Engineer / Tech Lead review
> **Date:** 2026-11-22
> **Scope:** The whole repo (`backend/`, `frontend/`, `talent_hub.sql`). Based on commit `97987d8` on `main`.

---

## 0. Executive Summary

TalentHub is a small social media-sharing app. Users upload photos, audio and video, and other users like, comment on and follow them. It has two parts:

| Layer | Current stack | Size |
|---|---|---|
| Backend | Node.js + Express 4.19.2, Sequelize 6 + MySQL, JWT + Passport (Google OAuth), Multer saving uploads to local disk | about 30 files: 8 controllers, 9 routes, 7 models |
| Frontend | Create React App (`react-scripts ^3.0.1`), React 18, React Router 6, Axios, hand-written CSS | about 25 files, about 1,000 lines of CSS |
| Data | `talent_hub.sql` (a phpMyAdmin dump), 8 tables | — |

**Overall verdict:** The app works as a prototype, but it **is not safe to deploy publicly as it stands**. There are three critical problems, and all three come before any refactoring:

1. **Secrets and personal data are committed to git.** `backend/.env` (the JWT secret, DB credentials and OAuth settings) and `talent_hub.sql` (real user emails and bcrypt password hashes) are tracked files. `.env` has been in history since commit `4e2d22c`.
2. **Uploads have no limits at all.** There is no size limit and no file-type check, and the file extension comes straight from the client's file name. Uploaded files are then served from the API's own origin. That allows **stored XSS** (upload a `.html` or `.svg` file) and lets anyone **fill the disk** (DoS).
3. **Uploaded files live on the local disk.** Render's free tier, like every other free container host, has an ephemeral filesystem, so every upload is lost on each deploy or restart. Uploads have to move to object storage before hosting at zero cost is possible.

Recommended order: **Phase 1, then 4a (storage and DB), then 2, then 3, then 4b (go live).** Phase 1 blocks everything else. Phases 2 and 3 can run in parallel once the API contract is frozen (see §2.6).

---

## Phase 1: Security & Core

### 1.1 Hardcoded or committed secrets (CRITICAL)

| # | Finding | Location | Severity |
|---|---|---|---|
| S1 | `.env` is **committed to git**. It contains `JWT_SECRET`, `DB_USER=root`, an empty `DB_PASSWORD`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. There is no root `.gitignore`, and the backend has none either. | `backend/.env` (first committed in `4e2d22c`) | Critical |
| S2 | `JWT_SECRET` is a short (21-character), human-readable phrase. Anyone with repo access can forge a token for any user ID, including admins. | `backend/.env` | Critical |
| S3 | Session secret falls back to the literal string `'secret'`. | `backend/server.js:24` | High |
| S4 | Google OAuth falls back to `'dummy-client-id'` / `'dummy-client-secret'`. A misconfigured deploy starts without any error. | `backend/config/passport.js:6-7` | Medium |
| S5 | The DB dump contains **real user emails and bcrypt password hashes** (PII). | `talent_hub.sql:120-122` | High |
| S6 | The app connects to the DB as `root` with an empty password. | `backend/.env` | High (local) / Critical (if reused) |
| S7 | `node_modules/` is committed: about 4,200 of the 4,293 tracked files. It bloats the repo and hides lockfile drift. | `backend/node_modules/**` | Medium |
| S8 | User uploads are committed. | `backend/uploads/**` | Medium |

**Remediation steps:**
1. **Rotate first.** Generate a new `JWT_SECRET` (at least 64 random bytes: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`), and a new session secret if sessions are kept. If the Google credentials are real, rotate them in Google Cloud Console. Set a real DB password and create a least-privilege DB user.
2. Add a root `.gitignore` covering `node_modules/`, `.env*` (but not `.env.example`), `backend/uploads/`, `build/` and `dist/`.
3. Untrack the files with `git rm --cached -r backend/.env backend/node_modules backend/uploads`, and move `talent_hub.sql` to `backend/db/schema.sql` **without the data rows**. Seed data, if needed, uses fake users.
4. **Purge history** with `git filter-repo --path backend/.env --path talent_hub.sql --invert-paths` (plus the `node_modules` and `uploads` paths), then force-push. ⚠️ This rewrites history and needs a coordinated force-push, so it **needs explicit owner approval**. Rotation (step 1) is what actually fixes the leak. The purge is just cleanup.
5. Add `backend/.env.example` and `frontend/.env.example` with placeholder values.
6. **Validate config at startup** with a schema (zod or envalid). The process exits if `JWT_SECRET` is missing or shorter than 32 characters, and every `|| 'secret'` / `|| 'dummy-…'` fallback is removed.
7. Add secret scanning: `gitleaks` as a pre-commit hook and in CI, and turn on GitHub secret scanning and push protection.

### 1.2 Outdated or vulnerable dependencies

> Exact advisories should be confirmed with `npm audit` once lockfiles are regenerated. The versions below are what is currently pinned or installed.

**Backend (`backend/package.json`)**

| Package | Current | Target | Why |
|---|---|---|---|
| `express` | 4.19.2 | **5.x** (or at least 4.21.2) | 4.19.2 predates the Sept 2024 fixes in `path-to-regexp` (ReDoS), `body-parser`, `send` / `serve-static` (template injection / XSS) and `cookie`. Express 5 also passes async errors to the error handler natively, which removes all the try/catch boilerplate (see §2). |
| `multer` | 1.4.5-lts.1 | **2.x** | The 1.x line is unmaintained and has published DoS advisories (fixed in 2.0.0 and later). Multer is also used without limits (§1.3). |
| `nodemailer` | 6.9.15 | Remove, or 7.x | **Unused**. It isn't imported anywhere. Remove it until email is actually needed. |
| `bcryptjs` | 2.4.3 | 3.x (or native `argon2`) | Old release line. Use argon2id for new hashes if you can. Existing bcrypt hashes can be verified and rehashed when users log in. |
| `cookie-parser` | 1.4.6 | Keep only if moving to cookie auth (§1.4) | Currently **unused**. |
| `express-session` + `passport` + `passport-google-oauth20` | 1.19 / 0.7 / 2.0 | Replace the session flow (see §1.4) | Uses the default **MemoryStore**, which leaks memory and is explicitly not meant for production. Sessions are created, but the API never reads them. |
| `mysql2` (raw) | 3.14.2 | Remove `config/db.js` | Only used by two debug scripts. That gives two DB connection paths. |
| `dotenv` | 16.4.5 | Remove; use `node --env-file` | Node 20.6 and later load env files natively. Your local Node is v26. |
| — | — | **Add:** `helmet`, `express-rate-limit`, `zod`, `pino` / `pino-http`, `compression`, `hpp` (optional) | See §1.3. |

**Frontend (`frontend/package.json`)**

| Package | Current | Target | Why |
|---|---|---|---|
| `react-scripts` | **^3.0.1** (CRA 3, 2019, webpack 4) | **Remove → Vite (or Next.js, §3)** | CRA is officially deprecated (Feb 2025). v3 ships hundreds of transitive advisories and needs `--openssl-legacy-provider` to run on modern Node. That flag is a symptom of the problem, not a fix. |
| `@testing-library/*` | 13 / 13 / 5 | Vitest + RTL 16 | Matches the new toolchain. |
| `web-vitals` | 2.x | Drop, or 4.x | Leftover CRA boilerplate. |
| `cross-env` | 10.x | Drop | Vite reads `.env` and `--port` itself. |

### 1.3 Missing security headers and middleware

| # | Missing control | Evidence | Fix |
|---|---|---|---|
| M1 | **No security headers** (CSP, HSTS, X-Content-Type-Options, frame-ancestors, Referrer-Policy) | No `helmet` in `server.js` | `app.use(helmet())` with a strict CSP for the API. Use `crossOriginResourcePolicy: 'cross-origin'` only for media routes. |
| M2 | **No rate limiting**, so `/auth/signin` can be brute-forced without limit | — | `express-rate-limit`: a strict limiter on `/auth/*` (e.g. 10 per 15 min per IP plus per email) and a general limiter on `/api/*`. |
| M3 | **Unbounded uploads**: no `limits`, no `fileFilter`, extension taken from `file.originalname` | `routes/photoRoutes.js:9-18`, `audioRoutes.js:6-10`, `videoRoutes.js:6-10` | Set per-type `limits.fileSize` (e.g. 10 MB images, 25 MB audio, 200 MB video). Allowlist MIME types **and** check magic bytes (`file-type`). Generate the extension server-side from the detected type. Use random names (`crypto.randomUUID()`). Long term, upload straight to object storage with signed URLs (§2, §4). |
| M4 | **Stored XSS through `/uploads`.** Files are served from the API's origin, and the CORS logic falls back to allowing `localhost:3001` | `server.js:38-49` | Serve user content from a **separate origin** (CDN or object storage). Until then, send `X-Content-Type-Options: nosniff`, `Content-Disposition` and `Content-Security-Policy: sandbox` on `/uploads`. |
| M5 | **No input validation.** `title`, `comment`, `content_type` and `content_id` go straight into Sequelize. `content_type` is only checked by the DB enum, so bad values come back as raw 500 errors. | All controllers | Validate every route's body, params and query with zod. |
| M6 | **Error details leak to clients** (`error.message`, `err.errors`, `details`) | Every controller `catch` | One central error handler that returns a generic message plus a request ID and logs the details server-side. |
| M7 | **PII and secrets in logs.** `console.log('Signin request:', req.body)` logs **plaintext passwords**. `console.log('Signin success:', user)` logs password hashes. | `authController.js:7,21,31,48` | Remove these. Use `pino` with `redact: ['req.body.password', 'req.headers.authorization']`. |
| M8 | **The frontend logs every request and response, including headers (the bearer token)** | `frontend/src/api.js:9,17` | Remove the interceptors, or limit them to `import.meta.env.DEV`. |
| M9 | **User enumeration.** Signin returns `'Email not registered'` and `'Incorrect password'` as different messages. | `authController.js:38,44` | Return a single `'Invalid email or password'`, with constant-time behavior (always run the hash compare). |
| M10 | **CORS is hardcoded to localhost** | `server.js:28-31, 40` | Read an origin allowlist from env (`CORS_ORIGINS`). |
| M11 | **No body size limit and no `trust proxy`** | `server.js:22` | `express.json({ limit: '100kb' })` and `app.set('trust proxy', 1)`. Render runs behind a proxy, so rate limiting needs this. |
| M12 | **No password policy and no email normalization** on signup | `authController.js:6-27` | zod: email `.toLowerCase().trim()`, password at least 8 characters with a zxcvbn-style check. |
| M13 | `x-powered-by` header is exposed | Express default | `app.disable('x-powered-by')`, which helmet also does. |

### 1.4 Authentication and authorization defects (found during the security pass)

| # | Defect | Location | Impact |
|---|---|---|---|
| A1 | **Google OAuth flow is broken.** The callback creates a Passport *session* and redirects to `/` **on the backend (port 5000)**. No JWT is ever issued to the SPA, and `callbackURL` is relative. | `routes/authRoutes.js:13-15`, `config/passport.js:8` | "Continue with Google" can't log a user in to the frontend. |
| A2 | **Account takeover through OAuth email linking.** An existing password account gets linked to any Google profile with the same email, without checking `email_verified`. | `config/passport.js:12-23` | Check `profile._json.email_verified` before linking. |
| A3 | **`isAdmin` is never true on the client.** Signin and signup return `{id, email, name}` only, so `user?.is_admin` is always undefined. | `authController.js:22,49`; `*Card.js` | The admin UI is unreachable. |
| A4 | **Admin "block user" does nothing.** It writes `is_blocked`, a column that **exists in neither the model nor the DB**, and blocked users aren't checked anywhere. | `adminController.js:23`, `models/user.js` | A false sense of moderation. |
| A5 | **Admin `deleteContent` and owner deletes leave orphans.** They don't remove the file, likes or comments (polymorphic, so there's no FK cascade). | `adminController.js:6-17`, `*Controller.delete*` | Storage leaks and dangling rows. |
| A6 | **The UI "Delete" button never calls the API.** It only filters local state. | `pages/Feed.js:32-42`, `*Section.js` | The item comes back on refresh. |
| A7 | **The JWT is stored in `localStorage`, lasts 1 h and has no refresh token.** Users are silently logged out, and any XSS (see M4) can steal the token. | `context/AuthContext.js:27-29` | Move to an **httpOnly, Secure, SameSite cookie** with a short-lived access token and a rotating refresh token, or use a managed auth provider (see §2.4). |
| A8 | **`protect` doesn't check that the user still exists or is blocked.** A deleted or blocked user keeps API access until the token expires. | `authController.js:57-66` | Load the user (cached), check status, and attach a typed principal. |
| A9 | **Comments and likes accept any `content_id`**, including IDs of content that doesn't exist | `commentController.js`, `likeController.js` | Validate that the content exists through a content service. |

### 1.5 Phase 1 execution log (2026-11-22)

**Done:** rotated the local `JWT_SECRET` and added `SESSION_SECRET` · validated env at startup (`config/env.js`, no insecure fallbacks) · `.env.example` for both apps · root `.gitignore` · untracked `.env`, `node_modules`, `uploads`, `talent_hub.sql` (replaced by a schema-only `backend/db/schema.sql`) · Express 5, Multer 2, bcryptjs 3, Helmet 8, express-rate-limit 8, zod 4 · removed nodemailer, cookie-parser and dotenv · `uuid` override · helmet + strict CSP, CORS allow-list from env, body limits, `trust proxy`, request IDs · rate limits on auth, API and upload routes · hardened uploads (MIME allow-list, size limits, random names, sandboxed `/uploads`) · central error handler plus production 5xx masking · zod validation on signup and signin · generic, timing-safe login errors · JWT pinned to HS256 · Google OAuth gated on real credentials and `email_verified` · no passwords or tokens in logs (backend and frontend) · frontend: react-scripts 3 → 5 (no `--openssl-legacy-provider`), axios 1.21, react-router 7, `REACT_APP_API_URL` instead of hardcoded `localhost:5000`. Runtime `npm audit --omit=dev`: **0 vulnerabilities in both apps.**

**Deferred:**
- Git history purge (S1 step 4) is waiting for owner approval.
- Rotating the Google OAuth credentials is up to the owner, if they were real.
- Zod validation on the remaining routes, A1/A7 (OAuth token hand-off, httpOnly cookies), A3–A9 → Phase 2.
- 6 high advisories remain, confined to CRA build and dev tooling (svgo, webpack-dev-server). They're resolved by the Vite/Next migration in Phase 3.

**Phase 1 exit criteria:** Secrets are rotated and removed from the tree. `npm audit --omit=dev` shows 0 high or critical findings. helmet, rate limits, upload limits, zod validation and the central error handler are all in place. Passwords and tokens never appear in logs. gitleaks runs in CI.

---

## Phase 2: Architecture

### 2.1 Current shape

```
routes/*.js  ──►  controllers/*.js  ──►  Sequelize models  ──►  MySQL
   │                  │                                       ▲
   └─ multer config   └─ business logic + HTTP + DB + errors   │
      (duplicated x3)    all in one function                   └── config/db.js (2nd raw pool, scripts only)
server.js: wiring, CORS, static files, DB connect, listen — all in one file
```

### 2.2 Specific bottlenecks and design defects

| # | Bottleneck | Evidence | Consequence |
|---|---|---|---|
| B1 | **Three copies of the same feature.** `photoController`, `audioController` and `videoController` are about 140 lines each and almost identical. The same goes for the three route files, the three multer configs, the three models and, on the frontend, the three `*Section.js` and `*Card.js` files. | `controllers/{photo,audio,video}Controller.js` | Every fix has to be made 3 times (×2 counting the frontend), and the copies already differ (e.g. `photos.user_id` allows NULL while the others don't). |
| B2 | **Two separate like systems.** `/api/{type}/like/:id` changes the denormalized `likes` column. `/api/likes` (the one the UI actually uses) inserts rows but never updates the counter. | `*Controller.like*` vs `likeController.toggleLike` | The `likes` column is always wrong. Pick one source of truth. |
| B3 | **Race conditions on likes and follows.** The code does a read, then a write, with no transaction and no unique constraint. A double-click inserts duplicate rows, and `likes += 1` loses updates under concurrency. | `likeController.js:12-21`, `followController.js:13-21`, `*.likes += 1` | Data corruption. Fix: a `UNIQUE(user_id, content_type, content_id)` constraint, `INSERT … ON CONFLICT DO NOTHING`, and an atomic `UPDATE … SET likes = likes + 1` (or compute counts on read). |
| B4 | **N+1 queries in `getFollowers` and `getFollowing`.** There is one `findByPk` per follower, even though `belongsToMany` associations already exist. | `followController.js:56-64, 80-88` | O(n) DB round-trips. Use `include` or a single join. |
| B5 | **Client-side N+1 fan-out.** Every card mounts `SocialActions`, which sends **2 requests** (count plus status). The Feed renders 3 unpaginated lists, so N items means 3 + 2N requests on load. | `components/SocialActions.js:12-15`, `pages/Feed.js` | 100 items means about 200 requests. Return `likeCount`, `commentCount` and `likedByMe` **inside** the list response. |
| B6 | **No pagination.** `findAll()` returns every row with no `ORDER BY`. | `getAll{Photos,Audios,Videos}` | Response size grows without bound and the order isn't stable. Use cursor pagination (`?cursor=<created_at,id>&limit=20`). |
| B7 | **Missing composite indexes.** `likes` and `comments` are queried by `(content_type, content_id)` but only `content_id` is indexed. There are no unique keys on likes or follows. | `talent_hub.sql:187-197` | Full scans as the data grows. |
| B8 | **Local-disk media storage**, with relative `destination` paths that depend on `cwd` | multer configs | Can't scale horizontally, data is lost on ephemeral hosts, and the server breaks if started from another directory. |
| B9 | **The API process handles media bytes.** Uploads stream through Express, and media is served by `express.static`. | `server.js:38-49` | The API's bandwidth and event loop are spent on large files. Offload to storage/CDN with signed direct uploads. |
| B10 | **No layering.** HTTP, validation, business rules and persistence are mixed in each handler, and the same `try/catch` shape is repeated in over 25 handlers. | All controllers | Hard to unit-test. Behavior differs between endpoints (`error` vs `message`, 200 vs 201). |
| B11 | **No schema management.** Schema lives in a phpMyAdmin dump that has already drifted from the models (`messages` table has no model; `is_blocked` is used but doesn't exist). | `talent_hub.sql` | You can't deploy reproducibly. |
| B12 | **Server listens before the DB is ready.** `authenticate()` failures are only logged. There is no health endpoint and no graceful shutdown. | `server.js:60-72` | The platform sees "healthy" while every request returns 500. |
| B13 | **Auth middleware lives in a controller** (`authController.protect`), and `adminMiddleware` queries the DB on every admin request | `controllers/authController.js:57` | Unclear responsibilities. |
| B14 | **Inconsistent API surface.** `/auth/*` and `/users/*` have no `/api` prefix and there's no versioning. Response shapes vary (`{success, photos}` vs `{count}` vs `{message}`). | `server.js:34-58` | A brittle client contract. |
| B15 | **Zero tests.** The backend `test` script exits 1, and the frontend has only the CRA placeholder `App.test.js`. | `package.json` | No safety net for any of the refactors above. |

### 2.3 Target architecture

A **modular monolith** with feature modules and a layered design (routes → controller → service → repository). This is the right size for the project. Microservices would add cost and operational overhead with no benefit at this scale, and would break the zero-cost goal.

```
backend/
  src/
    app.ts                 # builds the express app (no listen), testable via supertest
    server.ts              # listen + graceful shutdown
    config/env.ts          # zod-validated config, fails fast
    lib/                   # logger (pino), db client, storage adapter, errors
    middleware/            # auth, requireRole, validate(schema), rateLimit, errorHandler, requestId
    modules/
      auth/                # routes, controller, service, schemas (zod)
      users/
      media/               # ONE module for photo | audio | video (kind discriminator)
        media.routes.ts
        media.controller.ts
        media.service.ts   # business rules: ownership, limits, counts
        media.repository.ts
        media.schemas.ts
      engagement/          # likes + comments (polymorphic over media)
      social/              # follows
      admin/               # moderation (uses services, not models directly)
    db/
      schema.prisma (or migrations/)
      seed.ts
  test/                    # vitest + supertest, testcontainers or a Neon branch DB
```

**Patterns for loose coupling and scalability:**

1. **Merge the three content types into one `media` table** with a `kind ENUM('photo','audio','video')` column, plus `storage_key`, `mime_type`, `size_bytes`, `width`, `height`, `duration_s` and `status ENUM('pending','ready','removed')`. That removes about 60% of the backend code (B1). It also turns `likes.content_id` and `comments.content_id` into **real foreign keys** to `media.id` with `ON DELETE CASCADE`, which fixes A5 and A9 in the schema itself.
2. **Repository pattern behind interfaces.** Services depend on a `MediaRepository` interface, not on the ORM. That lets you unit-test services with in-memory fakes and makes the ORM swappable.
3. **A storage adapter interface** (`StorageProvider { createUploadUrl, getPublicUrl, delete }`) with `LocalStorage` (dev) and `S3CompatibleStorage` (Cloudflare R2, Supabase Storage or Cloudinary) implementations. Upload flow: client calls `POST /api/v1/media/uploads` → server validates the metadata and returns a **presigned PUT URL** → client uploads directly to storage → client calls `POST /api/v1/media/:id/complete` → server verifies the object (size and type) and marks it `ready`. The API never handles media bytes (B8, B9).
4. **Domain events, in-process first.** A small typed event bus (`media.deleted`, `user.blocked`, `like.toggled`) decouples side effects such as deleting files from storage, cleaning up counters and future notifications from the request path. If needed, it can later move to a free-tier queue (Upstash QStash or Redis) without changing the publishers.
5. **Read-optimized list endpoints.** `GET /api/v1/media?kind=photo&cursor=…&limit=20` returns `likeCount`, `commentCount`, `likedByMe` and `author` in **one query** (a join or subselect). Counters are kept in sync with atomic SQL increments inside the same transaction as the like insert (B2, B3, B5, B6).
6. **Central concerns as middleware.** `requestId` → `pino-http` → `helmet` → `cors` → `rateLimit` → `auth` (optional or required) → `validate(zod)` → handler → `errorHandler`. Express 5's native async error propagation removes every hand-written try/catch (B10).
7. **One response and error format.** Success: `{ data, meta? }`. Error: [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) `application/problem+json` with `{ type, title, status, detail, requestId }` (B14).
8. **Versioned, documented API.** Everything goes under `/api/v1`. Generate an **OpenAPI 3.1** spec from the zod schemas (`zod-to-openapi`). The frontend gets a typed client from it, so the contract is enforced at compile time.
9. **RBAC in middleware:** `requireRole('admin')` reads the role from verified token claims, with a DB re-check only for destructive actions (B13, A3).
10. **Stateless API.** No sessions, no local disk. Any number of instances can run behind a load balancer, which is a requirement for free-tier hosts that sleep and restart.
11. **Health and lifecycle.** `GET /healthz` (liveness) and `GET /readyz` (checks the DB). On `SIGTERM`, stop accepting connections, finish in-flight requests and close the DB pool (B12).

### 2.4 Technology decisions (recommendations)

| Concern | Recommendation | Rationale |
|---|---|---|
| Language | **TypeScript** (backend and frontend) | The codebase is small, so migrating now is cheap. Shared types keep the API contract consistent. |
| Runtime | Node 22 LTS (pin in `engines` and `.nvmrc`) | Render and Vercel support it. Native `--env-file`, `fetch` and test runner. |
| Framework | **Express 5** (lowest-risk path from the current code) | Fastify or Hono are reasonable alternatives, but Express 5 keeps the existing team knowledge. |
| Database | **PostgreSQL on Neon (free tier)** | Neon's free tier doesn't expire, while Render's free Postgres expires after 30 days. It has branching for preview environments. JSONB and partial indexes help with feeds. *Alternative if MySQL must stay:* TiDB Cloud Serverless (MySQL-compatible, free tier). |
| ORM / migrations | **Prisma** (or Drizzle) with versioned migrations | Replaces the schema in the SQL dump (B11) and generates types. With 7 tables, migrating is about a day of work. |
| Auth | **Option A (recommended):** keep your own auth, but issue httpOnly cookie access and refresh tokens, and redo Google OAuth using an authorization-code flow that sets the cookie and then redirects to `FRONTEND_URL`. **Option B:** a managed provider (Auth0, Clerk or Supabase Auth free tiers) | Fixes A1, A2, A7 and A8. Option B removes most of the auth code, but adds a vendor dependency. |
| Media storage | **Cloudflare R2** (10 GB free, no egress fees), or **Cloudinary** (free tier, adds image and video transforms and thumbnails) | Required for ephemeral hosting. Cloudinary also gives responsive images and video posters for the new UI. |
| Validation | **zod** | One schema serves runtime validation, TypeScript types and OpenAPI. |
| Logging | **pino** + `pino-http` | Structured JSON logs, field redaction, cheap at runtime. |
| Testing | **Vitest + Supertest**, Playwright for E2E | Covers B15. Target at least 80% coverage on services, plus a contract test per endpoint. |

### 2.5 Database schema changes (summary)

- `users`: add `role ENUM('user','admin')` (replacing `is_admin`), `status ENUM('active','blocked')`, `avatar_url`, `bio`, `email_verified_at`, `updated_at`. Store emails case-normalized.
- `media` (new; replaces `photos`, `audios` and `videos`): add `kind`, `status` and storage metadata. Index `(kind, created_at DESC, id)` and `(user_id, created_at DESC)`.
- `likes`: FK to `media.id` with `ON DELETE CASCADE`, and **`UNIQUE(user_id, media_id)`**.
- `comments`: FK to `media.id` with `ON DELETE CASCADE`, index `(media_id, created_at)`, `updated_at`, and soft-delete `deleted_at`.
- `follows`: **`UNIQUE(follower_id, followed_id)`**, `CHECK (follower_id <> followed_id)`, FKs on both columns.
- `messages`: **drop it** (no code uses it), or plan it explicitly as a later feature.
- A data migration script copies rows from `photos`, `audios` and `videos` into `media`, and moves files from `uploads/` into object storage.

### 2.6 Delivery approach

1. Write **characterization tests** (Supertest) against the *current* endpoints first.
2. Introduce `/api/v1` next to the legacy routes, backed by the new modules.
3. Move the frontend to `/api/v1` (Phase 3), then delete the legacy routes.
4. Keep each PR small and reviewable: one module per PR.

**Phase 2 exit criteria:** A single media module. No duplicated controllers. Zero N+1 queries on the hot paths (feed and follows). Paginated lists. Unique constraints in place. The OpenAPI spec is published. Test coverage is at least 80% on services. The API is stateless (no sessions, no local disk).

---

## Phase 3: Frontend

### 3.1 Current state: problems

- **The toolchain is a dead end.** CRA 3 / webpack 4 needs `--openssl-legacy-provider`, has slow builds and is deprecated (see §1.2).
- **The API URL is hardcoded as `http://localhost:5000` in 6 files:** `api.js:4`, `AudioCard.js:15`, `PhotoCard.js:12`, `VideoCard.js:12`, `UploadForm.js:27-29`, `LandingPage.js:9`. Separately, `PhotoGallery.js` and `PhotoUpload.js` use raw `axios` with relative URLs that only work through a dev proxy that doesn't exist. **The production build can't work as it stands.**
- **Duplicated pages and components:** `AudioSection`, `PhotoSection` and `videoSection` are about 125 lines each and almost identical. There are 3 near-identical cards. `UploadForm`, `PhotoUpload` and the inline upload forms do the same job. There is dead code: `PhotoGallery`, `Home`, `PhotoUpload`, `AuthForm`, `test.css`, and the `CommentSection` imports in cards that never use them.
- **`AuthProvider` is mounted twice** (`index.js:12` and `App.js:18`), which creates two separate auth states.
- **No route protection.** `/upload` renders for guests and fails only when the user submits.
- **No data-fetching layer.** Data is loaded with manual `useEffect`. There's no caching, no loading or error states (`Feed.js` fetches have no `catch`), the `useEffect` dependency arrays are missing entries, there's no optimistic like, and errors are shown with `alert()`.
- **The token is duplicated.** Many components read `localStorage.getItem('token')` and build headers by hand, even though `api.defaults` already sets them.
- **Styling:** about 1,000 lines of global CSS across 8 files, with inline `style={{…}}` mixed in. Theme variables exist (`[data-theme='dark']` in `components.css`), but the theme is chosen by a JS toggle with no `prefers-color-scheme` default, so the initial render flashes the wrong theme.
- **Accessibility:** clickable `<div>`s (`Dashboard.js` module cards) with no keyboard support, icon-only buttons with no labels, modals with no focus trap and no Esc handling, and no visible focus styles.
- **Media UX:** full-size images with no `loading="lazy"`, responsive sizes or blur placeholders. Videos have no poster. Audio uses the bare native player. There are no upload progress bars.
- **"Share" does nothing** (`SocialActions.js:61`). There are no user profile pages, even though the backend supports follows.

### 3.2 Proposed stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + React 19 + TypeScript**, deployed on Vercel | First-class Vercel hosting at zero cost. Server Components make public feed and profile pages fast and indexable (SEO and link previews matter for a portfolio or talent site). `next/image` handles responsive, lazy, AVIF images. *Lighter alternative:* Vite + React Router 7 as a pure SPA, if SSR isn't wanted. |
| Styling | **Tailwind CSS v4** | Design tokens as CSS variables, built-in dark mode, no dead CSS shipped. Replaces all 8 CSS files. |
| Components | **shadcn/ui** (Radix primitives) | Accessible primitives (Dialog, DropdownMenu, Tabs, Toast, Sheet, Avatar, Skeleton) that you own as source code and can theme. |
| Icons | **lucide-react** | A consistent stroke icon set that ships with shadcn. It replaces `react-icons`, which brings in many icon families. |
| Motion | **Framer Motion** (`motion`) | Small transitions: card hover lift, like-button burst, shared-layout lightbox. Respects `prefers-reduced-motion`. |
| Server state | **TanStack Query v5** | Caching, infinite scroll (`useInfiniteQuery` with cursor pagination), optimistic likes and comments, retries. Removes every manual `useEffect` fetch. |
| API client | **Typed client generated from OpenAPI** (`openapi-typescript` + `openapi-fetch`) | The compiler catches API contract drift. A single `NEXT_PUBLIC_API_URL`. |
| Forms | **react-hook-form + zod** (sharing schemas with the backend where possible) | Inline validation and accessible error messages. |
| Uploads | Direct-to-storage presigned upload with a progress bar (`XMLHttpRequest` progress or `uploadthing`/Cloudinary widget), drag-and-drop dropzone | Matches the §2.3 upload flow. Large videos never touch the API. |
| Media | `next/image` (or Cloudinary loader), video `poster`, a custom audio player with a waveform (`wavesurfer.js`) | A noticeably more polished experience. |
| Theme | `next-themes` (system default plus toggle, no flash) | Fixes the theme flash. |
| Notifications | shadcn `Sonner` toasts | Replaces `alert()`. |
| Quality | ESLint (flat config) + Prettier + TypeScript strict, Vitest + RTL, Playwright E2E, Lighthouse CI | Measurable quality gates. |

### 3.3 Design direction: premium and responsive

- **Visual language:** a dark-first creator aesthetic, with a near-black `zinc-950` canvas, layered `zinc-900` surfaces, 1px `white/10` borders, soft glow on hover, and one vivid accent gradient (indigo → fuchsia, extending the current `#6366f1` / `#ec4899` brand colors) used sparingly for primary CTAs and the like state. A light theme mirrors it.
- **Typography:** `Geist` / `Inter` for UI, and a display face (e.g. `Cal Sans` or `Instrument Serif`) for hero and section titles. A fluid type scale using `clamp()`.
- **Layout:**
  - **Mobile (<640px):** a single column, a bottom tab bar (Home, Explore, Upload [+], Activity, Profile), and full-bleed media.
  - **Tablet:** a 2-column masonry grid and a collapsible sidebar.
  - **Desktop (≥1024px):** a left nav rail, a centered feed with a 3–4 column **masonry grid** for photos, a list layout for audio, and a 16:9 grid for video. The right rail shows trending creators and "who to follow".
- **Key screens:** landing page (hero with an animated media collage, social proof, CTA) → feed (tabs: For You, Following, Photos, Audio, Video; infinite scroll; skeleton loaders) → media detail (lightbox or modal route with a comment thread) → creator profile (cover, avatar, stats, follow button, tabbed portfolio) → upload (multi-step dropzone → details → publish, with progress) → settings → admin moderation table (shadcn DataTable).
- **Micro-interactions:** optimistic like with a heart burst, double-tap to like on mobile, hover-preview autoplay (muted) for videos, sticky mini-player for audio across navigation.
- **Accessibility target:** WCAG 2.2 AA. Every interactive element is a real button or link, focus is visible, contrast is at least 4.5:1, Radix provides focus traps, and alt text is required on photo upload.
- **Performance budget:** LCP < 2.5s on 4G, CLS < 0.1, JS < 170 KB gzipped for the feed route, Lighthouse ≥ 90 in all categories.

### 3.4 Proposed frontend structure

```
frontend/
  app/
    (marketing)/page.tsx            # landing
    (app)/layout.tsx                # nav rail / bottom tabs
    (app)/feed/page.tsx
    (app)/m/[id]/page.tsx           # media detail (+ @modal intercepting route)
    (app)/u/[handle]/page.tsx       # profile
    (app)/upload/page.tsx           # protected
    (app)/admin/page.tsx            # role-gated
    (auth)/signin, signup, callback
  components/ui/                    # shadcn generated
  components/media/                 # MediaCard (one, kind-aware), MediaGrid, AudioPlayer, Lightbox
  components/social/                # LikeButton, CommentThread, FollowButton
  lib/api/                          # generated types + client
  lib/auth/                         # session helpers, middleware.ts route guard
  hooks/                            # useMediaFeed, useToggleLike, ...
```

**Phase 3 exit criteria:** No hardcoded URLs. One kind-aware `MediaCard`. Every route works on screens 360px wide and larger. Lighthouse ≥ 90 on mobile. axe-core shows no critical issues. Playwright covers sign up → upload → like → comment → follow.

---

## Phase 4: Deployment (zero cost)

### 4.1 Target topology

```
                ┌──────────────────────┐
  Browser ───►  │ Vercel (Hobby)        │  Next.js frontend, preview deploys per PR
                └─────────┬────────────┘
                          │ HTTPS (NEXT_PUBLIC_API_URL)
                ┌─────────▼────────────┐       ┌───────────────────────┐
                │ Render (Free web svc) │──────►│ Neon Postgres (Free)  │
                │ Express API /api/v1   │       └───────────────────────┘
                └─────────┬────────────┘
                          │ presigned URLs
                ┌─────────▼────────────┐
  Browser ───►  │ Cloudflare R2 / Cloudinary (Free) │  media upload + CDN delivery
                └──────────────────────┘
```

| Component | Service | Free-tier notes |
|---|---|---|
| Frontend | **Vercel Hobby** | Non-commercial use only. Gives preview URLs per PR. |
| Backend | **Render Free Web Service** | **Sleeps after about 15 min idle**, with a cold start of about 30–60 s. The disk is **ephemeral** (that's why storage has to be external). There's a monthly limit on free instance hours. Optional: a free uptime pinger (UptimeRobot or cron-job.org) to keep it warm. Check Render's current terms on this. |
| Database | **Neon Free** | Doesn't expire, unlike Render's free Postgres, which is deleted after 30 days. Scales to zero. Use the **pooled** connection string. |
| Media | **Cloudflare R2** (10 GB, no egress) or **Cloudinary Free** | Either one makes the uploads persistent. |
| Email (later) | Resend free tier | Only if email verification or password reset is added. |
| Monitoring | Sentry (free dev plan), Render logs, UptimeRobot | Error tracking and uptime checks. |
| CI | GitHub Actions (free for public repos, monthly minutes for private) | Lint, typecheck, test, audit, gitleaks. |

> **Alternative:** If the cold starts on Render's free tier are unacceptable, the API could later run as **Vercel Functions** or on **Fly.io** / **Koyeb** free allowances. The stateless design in §2.3 is what makes that move possible.

### 4.2 Repository readiness checklist

**Repo hygiene (some of this is shared with Phase 1)**
- [ ] Root `.gitignore`. `node_modules`, `.env` and `uploads` untracked and purged from history.
- [ ] Convert to a workspace monorepo (**pnpm workspaces**): `apps/web`, `apps/api`, `packages/shared` (zod schemas, types).
- [ ] Pin Node in `.nvmrc` and `"engines": { "node": ">=22 <23" }`.
- [ ] `.env.example` for each app. A README with local setup steps.
- [ ] Add a `LICENSE` and update the root `README.md`. The current README is CRA boilerplate.

**Backend → Render**
- [ ] `PORT` from env. The server binds to `0.0.0.0` (the current code already reads `process.env.PORT`).
- [ ] Scripts: `"build": "tsc -p ."` (or `tsup`), `"start": "node dist/server.js"`, `"migrate:deploy": "prisma migrate deploy"`.
- [ ] `render.yaml` blueprint (infrastructure as code):
  ```yaml
  services:
    - type: web
      name: talenthub-api
      runtime: node
      plan: free
      rootDir: apps/api
      buildCommand: pnpm install --frozen-lockfile && pnpm build && pnpm migrate:deploy
      startCommand: pnpm start
      healthCheckPath: /healthz
      envVars:
        - key: NODE_ENV
          value: production
        - key: DATABASE_URL
          sync: false
        - key: JWT_SECRET
          generateValue: true
        - key: CORS_ORIGINS
          sync: false        # e.g. https://talenthub.vercel.app
        - key: FRONTEND_URL
          sync: false
        - key: R2_ACCOUNT_ID
          sync: false
        - key: R2_ACCESS_KEY_ID
          sync: false
        - key: R2_SECRET_ACCESS_KEY
          sync: false
        - key: R2_BUCKET
          sync: false
        - key: GOOGLE_CLIENT_ID
          sync: false
        - key: GOOGLE_CLIENT_SECRET
          sync: false
  ```
- [ ] `app.set('trust proxy', 1)`. CORS restricted to the Vercel production domain plus a preview-domain regex.
- [ ] **Cross-site cookies:** the frontend (`*.vercel.app`) and API (`*.onrender.com`) are different sites, so auth cookies need `SameSite=None; Secure`. **Better:** proxy `/api/*` through Vercel rewrites (`next.config.ts` → `rewrites`) so the cookies are first-party. Or put both on a custom domain (`app.example.com` / `api.example.com`).
- [ ] Google OAuth: register `https://<api>/api/v1/auth/google/callback` and the Vercel origin in Google Cloud Console.
- [ ] Health check `/healthz` and graceful `SIGTERM` handling (Render sends SIGTERM on deploy).

**Database → Neon**
- [ ] Create the project and copy the pooled `DATABASE_URL` (`?sslmode=require`).
- [ ] Run `prisma migrate deploy` in the Render build. Seed only in non-production environments.
- [ ] Optional: a Neon branch per PR preview (the Neon–Vercel integration).
- [ ] Run a one-off migration script to move existing MySQL data and `uploads/` files into Neon and R2.

**Frontend → Vercel**
- [ ] Import the repo and set the root directory to `apps/web`. The framework preset (Next.js) is detected automatically.
- [ ] Env: `NEXT_PUBLIC_API_URL` (or use rewrites and keep the API URL server-side only as `API_URL`).
- [ ] `next.config.ts`: `images.remotePatterns` for the R2 or Cloudinary domain, and security headers (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- [ ] With a Vite SPA instead: `vercel.json` needs the SPA fallback rewrite `{ "source": "/(.*)", "destination": "/index.html" }`.

**CI/CD (GitHub Actions)**
- [ ] On PR: install → lint → typecheck → unit tests → `npm audit --audit-level=high` → gitleaks → build. Use Postgres in a service container, or a Neon branch, for integration tests.
- [ ] On merge to `main`: Vercel and Render auto-deploy from GitHub, and migrations run in the Render build step.
- [ ] Dependabot or Renovate for weekly dependency updates.

### 4.3 Rollout plan

1. **Staging first:** deploy on the free tiers using a `staging` branch, with seed data only.
2. Run the data migration (MySQL → Neon, `uploads/` → R2) on a copy of the data, and check row counts and file checksums.
3. Smoke test: sign up, Google login, upload each media type, like, comment, follow, admin delete.
4. Cut over: point production env vars at the new services, then watch Sentry and Render logs for 48 h.
5. **Rollback:** Vercel's instant rollback to the previous deployment, Render's "rollback to previous deploy", and Neon point-in-time restore (within the free-tier history window).

**Phase 4 exit criteria:** A public URL works end to end on free tiers. Uploads survive a redeploy. CI is green and required for merges. No secrets in the repo. A documented runbook for deploys and rollbacks.

---

## Appendix A: Prioritized Backlog

| Priority | Item | Phase | Effort |
|---|---|---|---|
| P0 | Rotate secrets; untrack `.env`, `node_modules`, `uploads`, SQL PII; add `.gitignore`; gitleaks | 1 | S |
| P0 | Stop logging passwords and tokens (backend and frontend) | 1 | XS |
| P0 | Multer limits, MIME/magic-byte allowlist, random names; serve uploads with `nosniff` and sandbox | 1 | S |
| P0 | helmet, rate limiting, body size limit, `trust proxy`, env-based CORS | 1 | S |
| P1 | Upgrade Express → 5, multer → 2; drop unused deps | 1 | S |
| P1 | zod validation and central error handler; generic auth errors | 1 | M |
| P1 | Fix the Google OAuth flow (A1, A2) and the auth token model (A7) | 1/2 | M |
| P1 | Characterization tests for the current API | 2 | M |
| P1 | Prisma + Postgres schema with unique constraints and FKs; data migration | 2/4 | M |
| P1 | Object storage adapter and presigned uploads | 2/4 | M |
| P2 | Single `media` module; atomic like counters; paginated feed with embedded counts | 2 | L |
| P2 | Fix admin: real `role` and `status` columns, block enforcement, cascade deletes | 2 | M |
| P2 | OpenAPI spec and typed client | 2/3 | S |
| P2 | Next.js + Tailwind + shadcn frontend rebuild | 3 | L |
| P3 | Profiles, follow feed, share links, audio mini-player | 3 | M |
| P3 | Monorepo, `render.yaml`, Vercel config, CI pipeline, Sentry | 4 | M |

*Effort: XS < 2h, S ≈ ½ day, M ≈ 1–3 days, L ≈ 1–2 weeks (one engineer).*

## Appendix B: Decisions Needed From You Before Execution

1. **History rewrite:** Do you approve purging `.env`, `node_modules`, `uploads` and the SQL dump from git history (needs a force-push to `main`)?
2. **Database:** Move to **PostgreSQL on Neon** (recommended), or stay on MySQL (TiDB Serverless)?
3. **Auth:** Keep your own JWT auth with httpOnly cookies (recommended), or adopt a managed provider (Auth0 / Clerk / Supabase Auth)?
4. **Frontend framework:** **Next.js** (recommended: SSR/SEO, best fit for Vercel), or a **Vite SPA** (simpler, closer to the current app)?
5. **Media storage:** **Cloudflare R2** (cheapest, no egress fees), or **Cloudinary** (built-in image and video transforms)?
6. **TypeScript migration:** Do it alongside each phase (recommended), or as a separate pass?

---

*Phase execution is on hold until you explicitly approve. Nothing in this plan has been applied yet.*
