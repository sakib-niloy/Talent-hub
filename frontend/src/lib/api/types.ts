// Types mirrored from docs/API.md (the API v1 contract). Keep in sync with the backend.

export type MediaKind = "photo" | "audio" | "video";
export type Role = "user" | "admin";
export type UserStatus = "active" | "blocked";

export interface PublicUser {
  id: number;
  name: string;
  handle: string;
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
  isFollowing: boolean;
  isMe: boolean;
}

export interface Media {
  id: number;
  kind: MediaKind;
  title: string;
  description: string | null;
  url: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  author: PublicUser;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface Comment {
  id: number;
  mediaId: number;
  body: string;
  createdAt: string;
  author: PublicUser;
  canDelete: boolean;
}

export interface UploadTicket {
  mediaId: number;
  upload: {
    url: string;
    method: "PUT";
    headers: Record<string, string>;
  };
  expiresAt: string;
}

export interface AdminUser extends CurrentUser {
  status: UserStatus;
  mediaCount: number;
}

export interface AdminStats {
  users: number;
  media: number;
  comments: number;
  likes: number;
}

export interface PageMeta {
  nextCursor: string | null;
}

export interface Envelope<T> {
  data: T;
  meta?: PageMeta;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  requestId?: string;
  errors?: { path: string; message: string }[];
}
