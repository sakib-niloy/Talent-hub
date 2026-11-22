import { ApiError, request } from "./client";
import type {
  AdminStats,
  AdminUser,
  Comment,
  CurrentUser,
  Envelope,
  Media,
  MediaKind,
  Page,
  Profile,
  PublicUser,
  Role,
  UploadTicket,
  UserStatus,
} from "./types";

const page = async <T>(p: Promise<Envelope<T[]>>): Promise<Page<T>> => {
  const res = await p;
  return { data: res.data, meta: res.meta ?? { nextCursor: null } };
};

/* ---------------------------------- auth ---------------------------------- */

export const authApi = {
  /** Returns null when signed out (401) instead of throwing. */
  async me(): Promise<CurrentUser | null> {
    try {
      const res = await request<{ user: CurrentUser }>("/auth/me", { silent401: true });
      return res.data.user;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },
  async signin(body: { email: string; password: string }) {
    return (await request<{ user: CurrentUser }>("/auth/signin", { method: "POST", body, silent401: true })).data.user;
  },
  async signup(body: { name: string; email: string; password: string }) {
    return (await request<{ user: CurrentUser }>("/auth/signup", { method: "POST", body })).data.user;
  },
  async signout() {
    await request<void>("/auth/signout", { method: "POST" });
  },
  async providers() {
    return (await request<{ google: boolean }>("/auth/providers")).data;
  },
  googleUrl(next = "/feed") {
    return `/api/v1/auth/google?next=${encodeURIComponent(next)}`;
  },
};

/* ---------------------------------- users --------------------------------- */

export const usersApi = {
  async suggestions(limit = 5) {
    return (await request<PublicUser[]>("/users/suggestions", { query: { limit } })).data;
  },
  async profile(handle: string) {
    return (await request<Profile>(`/users/${encodeURIComponent(handle)}`)).data;
  },
  async updateMe(body: { name?: string; bio?: string }) {
    return (await request<{ user: CurrentUser }>("/users/me", { method: "PATCH", body })).data.user;
  },
  followers(handle: string, cursor?: string) {
    return page(request<PublicUser[]>(`/users/${encodeURIComponent(handle)}/followers`, { query: { cursor } }));
  },
  following(handle: string, cursor?: string) {
    return page(request<PublicUser[]>(`/users/${encodeURIComponent(handle)}/following`, { query: { cursor } }));
  },
  async follow(handle: string) {
    return (
      await request<{ isFollowing: boolean; followerCount: number }>(`/users/${encodeURIComponent(handle)}/follow`, {
        method: "POST",
      })
    ).data;
  },
  async unfollow(handle: string) {
    return (
      await request<{ isFollowing: boolean; followerCount: number }>(`/users/${encodeURIComponent(handle)}/follow`, {
        method: "DELETE",
      })
    ).data;
  },
};

/* ---------------------------------- media --------------------------------- */

export interface MediaListParams {
  kind?: MediaKind;
  author?: string;
  feed?: "following";
  limit?: number;
}

export const mediaApi = {
  list(params: MediaListParams, cursor?: string) {
    return page(request<Media[]>("/media", { query: { ...params, cursor } }));
  },
  async get(id: number) {
    return (await request<Media>(`/media/${id}`)).data;
  },
  async create(body: { kind: MediaKind; title: string; description?: string; mimeType: string; sizeBytes: number }) {
    return (await request<UploadTicket>("/media", { method: "POST", body })).data;
  },
  async complete(id: number) {
    return (await request<Media>(`/media/${id}/complete`, { method: "POST" })).data;
  },
  async update(id: number, body: { title?: string; description?: string }) {
    return (await request<Media>(`/media/${id}`, { method: "PATCH", body })).data;
  },
  async remove(id: number) {
    await request<void>(`/media/${id}`, { method: "DELETE" });
  },
  async like(id: number) {
    return (await request<{ liked: boolean; likeCount: number }>(`/media/${id}/like`, { method: "POST" })).data;
  },
  async unlike(id: number) {
    return (await request<{ liked: boolean; likeCount: number }>(`/media/${id}/like`, { method: "DELETE" })).data;
  },
  comments(id: number, cursor?: string) {
    return page(request<Comment[]>(`/media/${id}/comments`, { query: { cursor } }));
  },
  async addComment(id: number, body: string) {
    return (await request<Comment>(`/media/${id}/comments`, { method: "POST", body: { body } })).data;
  },
  async deleteComment(commentId: number) {
    await request<void>(`/comments/${commentId}`, { method: "DELETE" });
  },
};

/* ---------------------------------- admin --------------------------------- */

export const adminApi = {
  async stats() {
    return (await request<AdminStats>("/admin/stats")).data;
  },
  users(q?: string, cursor?: string) {
    return page(request<AdminUser[]>("/admin/users", { query: { q, cursor } }));
  },
  async updateUser(id: number, body: { status?: UserStatus; role?: Role }) {
    return (await request<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body })).data;
  },
  async deleteMedia(id: number) {
    await request<void>(`/admin/media/${id}`, { method: "DELETE" });
  },
};
