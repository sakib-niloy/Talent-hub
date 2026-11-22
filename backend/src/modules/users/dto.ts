import { users } from '../../db/schema.js';
import type { AuthUser } from '../../types/express.js';

export const publicUserColumns = {
  id: users.id,
  name: users.name,
  handle: users.handle,
  avatarUrl: users.avatarUrl,
  bio: users.bio,
};

export interface PublicUser {
  id: number;
  name: string;
  handle: string;
  avatarUrl: string | null;
  bio: string | null;
}

export const toCurrentUser = (u: AuthUser) => ({
  id: u.id,
  name: u.name,
  handle: u.handle,
  avatarUrl: u.avatarUrl,
  bio: u.bio,
  email: u.email,
  role: u.role,
  createdAt: u.createdAt.toISOString(),
});
