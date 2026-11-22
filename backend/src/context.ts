// Composition root types: everything a module needs is passed in explicitly (no globals),
// which keeps modules loosely coupled and lets tests build an app with in-memory deps.
import type { Config } from './config/env.js';
import type { Database, Db } from './lib/db.js';
import type { EventBus } from './lib/events.js';
import type { Logger } from './lib/logger.js';
import type { StorageProvider } from './lib/storage/index.js';

export interface AppContext {
  config: Config;
  database: Database;
  db: Db;
  storage: StorageProvider;
  events: EventBus;
  logger: Logger;
}
