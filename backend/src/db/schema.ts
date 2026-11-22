import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['user', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'blocked']);
export const mediaKindEnum = pgEnum('media_kind', ['photo', 'audio', 'video']);
export const mediaStatusEnum = pgEnum('media_status', ['pending', 'ready']);

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: text().notNull().unique(), // stored lower-cased
  passwordHash: text(), // null for Google-only accounts
  googleId: text().unique(),
  name: text().notNull(),
  handle: text().notNull().unique(),
  bio: text(),
  avatarUrl: text(),
  role: roleEnum().notNull().default('user'),
  status: userStatusEnum().notNull().default('active'),
  tokenVersion: integer().notNull().default(0), // bump to revoke all sessions
  ...timestamps,
});

export const media = pgTable(
  'media',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: mediaKindEnum().notNull(),
    status: mediaStatusEnum().notNull().default('pending'),
    title: text().notNull(),
    description: text(),
    storageKey: text().notNull().unique(),
    mimeType: text().notNull(),
    sizeBytes: integer().notNull(),
    likeCount: integer().notNull().default(0),
    commentCount: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index('media_feed_idx').on(t.status, t.createdAt.desc(), t.id.desc()),
    index('media_kind_feed_idx').on(t.kind, t.status, t.createdAt.desc(), t.id.desc()),
    index('media_user_idx').on(t.userId, t.createdAt.desc()),
  ]
);

export const likes = pgTable(
  'likes',
  {
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mediaId: integer()
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.mediaId] }), index('likes_media_idx').on(t.mediaId)]
);

export const comments = pgTable(
  'comments',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    mediaId: integer()
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('comments_media_idx').on(t.mediaId, t.createdAt, t.id)]
);

export const follows = pgTable(
  'follows',
  {
    followerId: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followedId: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followedId] }),
    index('follows_followed_idx').on(t.followedId, t.createdAt.desc()),
    check('follows_no_self', sql`${t.followerId} <> ${t.followedId}`),
  ]
);

export type User = typeof users.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type MediaKind = (typeof mediaKindEnum.enumValues)[number];
