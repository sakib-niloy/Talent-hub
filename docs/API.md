# TalentHub API v1 Contract

The single source of truth shared by `backend/` (Express 5 + Drizzle/Postgres) and `frontend/` (Next.js).

## Conventions

- **Base path:** `/api/v1`. In the browser, always call the API **relative to the frontend origin** (`/api/v1/...`). Next.js rewrites proxy `/api/:path*` to `${API_ORIGIN}/api/:path*`, so cookies are first-party.
- **Auth:** an httpOnly cookie `th_session` (a JWT, 7 days, `SameSite=Lax`, `Secure` in production). The browser sends it automatically with `credentials: 'include'` (same origin, so the default `same-origin` also works). Nothing is ever stored in `localStorage`.
- **CSRF:** mutating requests must send `Content-Type: application/json` (when they have a body), and their `Origin` must be in the allow-list.
- **Success envelope:** `{ "data": <payload>, "meta"?: { "nextCursor": string | null } }`
- **Error envelope:** [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457), `Content-Type: application/problem+json`:
  ```json
  { "type": "about:blank", "title": "Bad Request", "status": 400, "detail": "Password must be at least 8 characters",
    "requestId": "uuid", "errors": [{ "path": "password", "message": "..." }] }
  ```
  The frontend shows `detail` to the user. `errors` is optional and lists field-level validation issues.
- **Pagination:** cursor-based. `?cursor=<opaque>&limit=<1..50, default 20>`. The response `meta.nextCursor` is `null` when there are no more results.
- **Timestamps:** ISO-8601 strings (UTC). **IDs:** integers.
- **Rate limits:** `429` with `Retry-After`. Auth routes: 10 failed attempts per 15 min. API: 600 per 15 min. Upload creation: 30 per hour.

## Types (TypeScript)

```ts
export type MediaKind = 'photo' | 'audio' | 'video';
export type Role = 'user' | 'admin';
export type UserStatus = 'active' | 'blocked';

export interface PublicUser {
  id: number;
  name: string;
  handle: string;           // unique, URL-safe, e.g. "niloy" or "niloy-4f2a"
  avatarUrl: string | null;
  bio: string | null;
}

export interface CurrentUser extends PublicUser {
  email: string;
  role: Role;
  createdAt: string;
}

export interface Profile extends PublicUser {
  createdAt: string;
  followerCount: number;
  followingCount: number;
  mediaCount: number;
  isFollowing: boolean;     // false when signed out or viewing yourself
  isMe: boolean;
}

export interface Media {
  id: number;
  kind: MediaKind;
  title: string;
  description: string | null;
  url: string;              // absolute or root-relative URL of the file; use as-is for <img>/<audio>/<video> src
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  author: PublicUser;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;       // false when signed out
}

export interface Comment {
  id: number;
  mediaId: number;
  body: string;
  createdAt: string;
  author: PublicUser;
  canDelete: boolean;       // the comment's author, the media's owner, or an admin
}

export interface UploadTicket {
  mediaId: number;
  upload: {
    url: string;            // absolute (object storage) or root-relative (local dev) URL
    method: 'PUT';
    headers: Record<string, string>; // send exactly these headers with the PUT (includes Content-Type)
  };
  expiresAt: string;
}

export interface AdminUser extends CurrentUser { status: UserStatus; mediaCount: number; }
export interface AdminStats { users: number; media: number; comments: number; likes: number; }
```

Upload limits: photo ≤ 10 MB (`image/jpeg|png|webp|gif`), audio ≤ 25 MB (`audio/mpeg|wav|x-wav|ogg|aac|mp4|x-m4a|flac|webm`), video ≤ 200 MB (`video/mp4|webm|ogg|quicktime`).

## Endpoints

### Health
| Method | Path | Response |
|---|---|---|
| GET | `/healthz` (no `/api/v1` prefix) | `200 {"status":"ok"}`, liveness |
| GET | `/readyz` (no prefix) | `200 {"status":"ready"}` / `503`, checks the DB |

### Auth: `/api/v1/auth`
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/signup` | `{ name (1-100), email, password (8-128) }` | `201 { data: { user: CurrentUser } }` + sets cookie. `409` if the email exists |
| POST | `/signin` | `{ email, password }` | `200 { data: { user: CurrentUser } }` + sets cookie. `401` "Invalid email or password". `403` if blocked |
| POST | `/signout` | — | `204`, clears the cookie |
| GET | `/me` | — | `200 { data: { user: CurrentUser } }`, or `401` when signed out |
| GET | `/providers` | — | `200 { data: { google: boolean } }` |
| GET | `/google?next=/feed` | — | `302` to Google (`503` problem if not configured) |
| GET | `/google/callback` | — | Sets the cookie, then `302` to `${FRONTEND_URL}${next}`. On failure, `302` to `${FRONTEND_URL}/signin?error=oauth` |

### Users: `/api/v1/users`
| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/suggestions?limit=5` | optional | `{ data: PublicUser[] }`: users to follow (excludes you and people you already follow) |
| GET | `/:handle` | optional | `{ data: Profile }`, or `404` |
| PATCH | `/me` | required | Body `{ name?, bio? (≤ 300) }` → `{ data: { user: CurrentUser } }` |
| GET | `/:handle/followers` | optional | `{ data: PublicUser[], meta }` (paginated) |
| GET | `/:handle/following` | optional | `{ data: PublicUser[], meta }` (paginated) |
| POST | `/:handle/follow` | required | `{ data: { isFollowing: true, followerCount } }` (idempotent). `400` if you follow yourself |
| DELETE | `/:handle/follow` | required | `{ data: { isFollowing: false, followerCount } }` (idempotent) |

### Media: `/api/v1/media`
| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/` | optional | Query `kind?`, `author?` (handle), `feed?=following` (requires auth), `cursor?`, `limit?` | `{ data: Media[], meta }`, newest first, only `ready` media |
| GET | `/:id` | optional | — | `{ data: Media }`, or `404` |
| POST | `/` | required | `{ kind, title (1-120), description? (≤ 2000), mimeType, sizeBytes }` | `201 { data: UploadTicket }`: creates a *pending* media row |
| PUT | *`ticket.upload.url`* | — (signed URL) | Raw file bytes, with `ticket.upload.headers` | `200` (from storage or the API's local driver) |
| POST | `/:id/complete` | required (owner) | — | `{ data: Media }`: the server checks the stored object (size, type, magic bytes) and marks it `ready`. `422` if invalid (the object is deleted) |
| PATCH | `/:id` | required (owner) | `{ title?, description? }` | `{ data: Media }` |
| DELETE | `/:id` | required (owner or admin) | — | `204`. Removes the file, likes and comments |
| POST | `/:id/like` | required | — | `{ data: { liked: true, likeCount } }` (idempotent) |
| DELETE | `/:id/like` | required | — | `{ data: { liked: false, likeCount } }` (idempotent) |
| GET | `/:id/comments` | optional | `cursor?`, `limit?` | `{ data: Comment[], meta }`, oldest first |
| POST | `/:id/comments` | required | `{ body (1-2000) }` | `201 { data: Comment }` |

### Comments: `/api/v1/comments`
| Method | Path | Auth | Response |
|---|---|---|---|
| DELETE | `/:id` | required (the comment's author, the media's owner, or an admin) | `204` |

### Admin: `/api/v1/admin` (role `admin` only, `403` otherwise)
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/stats` | — | `{ data: AdminStats }` |
| GET | `/users` | `q?`, `cursor?`, `limit?` | `{ data: AdminUser[], meta }` |
| PATCH | `/users/:id` | `{ status?: 'active'\|'blocked', role?: Role }` | `{ data: AdminUser }`. Blocking takes effect immediately on the next request |
| DELETE | `/media/:id` | — | `204` |

## Upload flow (client)

```
1. POST /api/v1/media  {kind,title,description,mimeType:file.type,sizeBytes:file.size}  -> UploadTicket
2. PUT ticket.upload.url  body=file  headers=ticket.upload.headers   (use XMLHttpRequest for progress events)
3. POST /api/v1/media/{mediaId}/complete  -> Media (status ready, appears in feeds)
```
