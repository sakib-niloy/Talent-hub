# TalentHub Web

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript strict · Tailwind CSS v4 · shadcn/ui (Radix) · TanStack Query v5 · react-hook-form + zod · next-themes · sonner · motion.

Implements the contract in [`../docs/API.md`](../docs/API.md).

## Develop

```bash
cp .env.example .env.local      # set API_ORIGIN (default http://localhost:5000)
npm install
npm run dev                     # http://localhost:3000 (must match the API's FRONTEND_URL / CORS_ORIGINS)
```

The browser only ever calls this origin. `next.config.ts` rewrites `/api/*` (and `/uploads/*`) to `API_ORIGIN`, so the `th_session` auth cookie is first-party and no tokens touch JavaScript.

> **`API_ORIGIN` is read at build time.** Rewrites are compiled into the build, so set it **before** `next build` (on Vercel: Project → Settings → Environment Variables, then redeploy).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint (next/core-web-vitals + TS) |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |

## Structure

```
src/app/(marketing)/page.tsx      landing
src/app/(app)/…                   app shell (left rail, mobile tabs, who-to-follow rail)
  feed/ explore/ m/[id]/ u/[handle]/ upload/ settings/ admin/
src/app/(auth)/signin, signup     auth (Google button shown only if /auth/providers says so)
src/lib/api/                      typed fetch client (RFC 9457 errors, cold-start retry), endpoints, XHR upload
src/hooks/                        TanStack Query hooks (optimistic likes/follows, infinite feeds)
src/components/                   media (card, audio player, actions), social, layout, ui (shadcn)
```

## Deploy (Vercel, free Hobby plan)

1. Import the repo and set **Root Directory** to `frontend` (framework preset: Next.js).
2. Set the env var `API_ORIGIN=https://<your-api>.onrender.com`.
3. Deploy. Then set the API's `FRONTEND_URL` / `CORS_ORIGINS` to the Vercel URL.

Render's free tier sleeps when idle. The client retries gateway errors with backoff and shows a "Waking up the server…" banner instead of failing.
