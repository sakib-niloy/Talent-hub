# Deploying TalentHub for free

Total time: about 20–30 minutes of clicking. All services below have a free tier that doesn't expire.

```
Browser ──► Vercel (Next.js, frontend/) ──/api/* rewrite──► Render (Express API, backend/) ──► Neon Postgres
   │                                                                  │
   └──────────── direct upload (signed PUT) / media GET ─────────────► Cloudflare R2 bucket
```

The browser only ever talks to the Vercel domain for the app and API. Vercel proxies `/api/*` to Render, so the login cookie is first-party and not blocked by Safari/Chrome third-party cookie rules. Media files go straight to and from R2.

| Piece | Service (free plan) | Notes |
|---|---|---|
| Frontend | Vercel Hobby | Non-commercial use only |
| API | Render Free Web Service | Sleeps after about 15 min idle. The first request after that takes about 30–60 s, and the UI shows "Waking up the server…" |
| Database | Neon Free | Scales to zero. Never expires, unlike Render's free Postgres, which is deleted after 30 days |
| Media | Cloudflare R2 (10 GB, no egress fees) | R2 asks for a payment method on file even on the free tier. **No card?** Use Supabase Storage instead (see 2b) |

---

## 0. Push the code (one time)

Git history was rewritten to purge old secrets, so the first push must be a force-push:

```bash
git checkout main
git merge --ff-only modernization
git push --force-with-lease origin main
```

> Anyone else with a clone of the old history should re-clone. The leaked JWT secret is already rotated, so it's useless.

## 1. Database: Neon

1. Sign up at https://neon.tech, then **New Project**. Region: **AWS US West (Oregon)**, which matches Render's `oregon` region in `render.yaml`.
2. **Connection Details**, then turn on **Pooled connection** and copy the URL. It looks like
   `postgresql://user:pass@ep-xxx-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require`.
   This is your `DATABASE_URL`. The API creates the tables automatically on its first boot.

## 2a. Media storage: Cloudflare R2

1. Cloudflare dashboard, then **R2**, then **Create bucket**: name it `talenthub-media`.
2. Bucket, then **Settings**, then **Public Development URL**: **Enable**. Copy `https://pub-xxxx.r2.dev`. That's `S3_PUBLIC_URL`.
3. Bucket, then **Settings**, then **CORS policy**, then **Edit**. Paste this, replacing the Vercel URL with yours (step 4):
   ```json
   [
     {
       "AllowedOrigins": ["https://YOUR-APP.vercel.app", "http://localhost:3000"],
       "AllowedMethods": ["PUT", "GET", "HEAD"],
       "AllowedHeaders": ["Content-Type"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. **R2 overview**, then **Manage API tokens**, then **Create API token**. Permission: **Object Read & Write**, limited to `talenthub-media`. Copy the **Access Key ID** and **Secret Access Key**. Your endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, and the account ID is shown on the R2 overview page.

## 2b. (Alternative, no card) Supabase Storage

Create a project at https://supabase.com, then **Storage**, then **New bucket** `talenthub-media` (Public). Then go to **Project Settings**, then **Storage**, then **S3 Connection**, enable it and create access keys. Use:
`S3_ENDPOINT=https://<project-ref>.supabase.co/storage/v1/s3`, `S3_REGION=<project region, e.g. us-west-1>`,
`S3_PUBLIC_URL=https://<project-ref>.supabase.co/storage/v1/object/public/talenthub-media`, `S3_FORCE_PATH_STYLE=true`.

## 3. API: Render

1. **Pick your Vercel project name now** (e.g. `talenthub-xyz`). Your frontend URL will be `https://talenthub-xyz.vercel.app`.
2. https://render.com, then **New**, then **Blueprint**, then connect the GitHub repo. Render reads `render.yaml`.
3. Fill in the prompted values:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Neon pooled URL (step 1) |
   | `FRONTEND_URL` | `https://talenthub-xyz.vercel.app` |
   | `CORS_ORIGINS` | same as `FRONTEND_URL` |
   | `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | from step 2 |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | leave empty for now (optional, step 6) |
   `JWT_SECRET` is generated automatically.
4. Deploy. When it's live, open `https://<service>.onrender.com/readyz`. It should return `{"status":"ready"}`.

## 4. Frontend: Vercel

1. https://vercel.com, then **Add New**, then **Project**, then import the repo.
2. **Project Name**: the name from step 3.1. **Root Directory**: `frontend`. The framework (Next.js) is detected automatically.
3. **Environment Variables**: `API_ORIGIN` = `https://<service>.onrender.com` (no trailing slash).
4. Deploy, then open the site, sign up, upload a photo, and like and comment on it.

> If Vercel gave you a different domain than you guessed, update `FRONTEND_URL` and `CORS_ORIGINS` on Render and the R2 CORS `AllowedOrigins`, then redeploy Render.

## 5. Make yourself admin

From your machine (Node 22+), in `backend/`:

```bash
npm ci
DATABASE_URL="<neon pooled url>" JWT_SECRET="any-32+-char-string-for-this-cli-run-only" npm run make-admin -- you@example.com
```
On Windows PowerShell, set the variables with `$env:DATABASE_URL="..."; $env:JWT_SECRET="..."` first. The admin dashboard is at `/admin`.

## 6. (Optional) Google sign-in

1. https://console.cloud.google.com, then **APIs & Services**, then **Credentials**, then **Create OAuth client ID** (type: Web application).
2. **Authorized JavaScript origins**: `https://talenthub-xyz.vercel.app`.
   **Authorized redirect URIs**: `https://talenthub-xyz.vercel.app/api/v1/auth/google/callback`.
3. Put the client ID and secret into Render's `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. The button appears automatically.

## 7. (Optional) Import the legacy MySQL data

The old `talent_hub.sql` and `backend/uploads/` are still on your machine (untracked). To bring the old users (passwords still work) and media into production, run this from `backend/`:

```bash
DATABASE_URL="<neon url>" JWT_SECRET="any-32+-chars-..." STORAGE_DRIVER=s3 \
S3_ENDPOINT=... S3_BUCKET=talenthub-media S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... S3_PUBLIC_URL=... \
npm run import:legacy -- ../talent_hub.sql ./uploads
```

## 8. (Optional) Avoid cold starts

Create a free monitor at https://uptimerobot.com: **HTTP(s)**, URL `https://<service>.onrender.com/healthz`, every 5 minutes. A single always-on free service stays within Render's monthly free instance hours. Check Render's current limits.

---

## Local development

```bash
# API: no database install needed (embedded Postgres in backend/.data)
cd backend && cp .env.example .env   # then set JWT_SECRET
npm ci && npm run dev                # http://localhost:5000

# Web
cd frontend && cp .env.example .env.local
npm ci && npm run dev                # http://localhost:3000
```

Tests: `cd backend && npm test`.

## Rollback

- **Vercel:** Deployments, then pick a previous deployment, then **Promote to Production**.
- **Render:** Events, then pick a previous deploy, then **Rollback**.
- **Neon:** Branches, then **Restore** (point-in-time, within the free plan's history window).
