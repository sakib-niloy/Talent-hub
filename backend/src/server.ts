import { loadConfig } from './config/env.js';
import { createLogger } from './lib/logger.js';
import { createDatabase } from './lib/db.js';
import { createStorage } from './lib/storage/index.js';
import { EventBus } from './lib/events.js';
import { createApp } from './app.js';
import type { AppContext } from './context.js';

async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
  const logger = createLogger(config);
  const database = await createDatabase({ url: config.DATABASE_URL, pgliteDir: config.PGLITE_DIR });
  if (config.RUN_MIGRATIONS) {
    await database.migrate();
    logger.info({ driver: database.driver }, 'database migrations applied');
  }

  const ctx: AppContext = {
    config,
    database,
    db: database.db,
    storage: createStorage(config),
    events: new EventBus(),
    logger,
  };
  const { app, mediaService } = createApp(ctx);

  // Periodically remove abandoned pending uploads.
  const sweeper = setInterval(() => {
    mediaService
      .sweepPending()
      .then((n) => n && logger.info({ removed: n }, 'swept stale pending uploads'))
      .catch((err) => logger.error({ err }, 'pending upload sweep failed'));
  }, 30 * 60_000);
  sweeper.unref();

  const server = app.listen(config.PORT, () => {
    logger.info(
      { port: config.PORT, env: config.NODE_ENV, db: database.driver, storage: ctx.storage.name, google: config.googleOAuthEnabled },
      'TalentHub API listening'
    );
  });

  // Graceful shutdown: stop accepting connections, let in-flight requests finish, close the DB.
  let closing = false;
  const shutdown = (signal: string) => {
    if (closing) return;
    closing = true;
    logger.info({ signal }, 'shutting down');
    clearInterval(sweeper);
    server.close(async () => {
      await database.close().catch(() => undefined);
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
