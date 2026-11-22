// Builds the Express app from explicit dependencies (no listen) so tests can use supertest.
import express from 'express';
import { pinoHttp } from 'pino-http';
import crypto from 'node:crypto';
import type { AppContext } from './context.js';
import { applySecurity } from './middleware/security.js';
import { createRateLimiters } from './middleware/rateLimit.js';
import { sessionMiddleware } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { LocalStorage } from './lib/storage/index.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/users/users.routes.js';
import { MediaService } from './modules/media/media.service.js';
import { commentRoutes, mediaRoutes } from './modules/media/media.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';

export function createApp(ctx: AppContext) {
  const app = express();
  const limiters = createRateLimiters(ctx.config);
  const mediaService = new MediaService(ctx);

  // Side effects decoupled from request handlers
  ctx.events.on('media.deleted', ({ storageKey }) => ctx.storage.delete(storageKey));
  ctx.events.onError((err) => ctx.logger.error({ err }, 'event handler failed'));

  app.use(
    pinoHttp({
      logger: ctx.logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === '/healthz' },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    })
  );
  applySecurity(app, ctx.config);

  // Health checks (platform probes) — outside rate limiting
  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.get('/readyz', async (_req, res) => {
    try {
      await ctx.database.ping();
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });

  const api = express.Router();
  api.use(limiters.api);
  api.use(sessionMiddleware(ctx));
  api.use('/auth', authRoutes(ctx, limiters));
  api.use('/users', userRoutes(ctx));
  api.use('/media', mediaRoutes(mediaService, limiters));
  api.use('/comments', commentRoutes(mediaService));
  api.use('/admin', adminRoutes(ctx, mediaService));
  if (ctx.storage instanceof LocalStorage) api.use(ctx.storage.router());
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler(ctx.logger));

  return { app, mediaService };
}
