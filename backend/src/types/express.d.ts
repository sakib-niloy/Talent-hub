import type { User } from '../db/schema.js';

export type AuthUser = Pick<
  User,
  'id' | 'email' | 'name' | 'handle' | 'role' | 'status' | 'avatarUrl' | 'bio' | 'createdAt' | 'tokenVersion'
>;

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      accountBlocked?: boolean;
    }
  }
}
