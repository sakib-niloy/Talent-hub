// HTTP hardening: security headers, CORS allow-list, CSRF origin check, body limits.
import express, { type Express, type RequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import type { Config } from '../config/env.js';
import { forbidden } from '../lib/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence in depth (cookies are already SameSite=Lax): reject state-changing requests
 * whose Origin (or Referer) isn't the API itself or an allow-listed frontend origin.
 * Requests with neither header (curl, server-to-server) are allowed.
 */
export function csrfGuard(config: Config): RequestHandler {
  const allowed = new Set([...config.CORS_ORIGINS, config.FRONTEND_URL]);
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const source = req.get('origin') ?? (req.get('referer') ? safeOrigin(req.get('referer')!) : undefined);
    if (!source) return next();
    const self = `${req.protocol}://${req.get('host')}`;
    if (source === self || allowed.has(source)) return next();
    next(forbidden('Cross-site request blocked'));
  };
}

function safeOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return 'invalid';
  }
}

export function applySecurity(app: Express, config: Config) {
  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY);

  app.use(
    helmet({
      // JSON API: nothing should ever render or be framed.
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
      strictTransportSecurity: config.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
      referrerPolicy: { policy: 'no-referrer' },
    })
  );

  app.use(
    cors({
      origin(origin, cb) {
        cb(null, !origin || config.CORS_ORIGINS.includes(origin));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
      maxAge: 600,
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));
  app.use(csrfGuard(config));
}
