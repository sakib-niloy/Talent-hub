// In-memory rate limiters (fine for a single free-tier instance; use a Redis store to scale out).
import { rateLimit, type Options } from 'express-rate-limit';
import type { Config } from '../config/env.js';
import { problemBody } from '../lib/errors.js';

const limiter = (windowMs: number, limit: number, detail: string, extra: Partial<Options> = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      res
        .status(429)
        .type('application/problem+json')
        .json(problemBody(429, detail, String(req.id)));
    },
    ...extra,
  });

export function createRateLimiters(config: Config) {
  return {
    auth: limiter(15 * 60_000, config.RATE_LIMIT_AUTH, 'Too many attempts. Please try again in 15 minutes.', {
      skipSuccessfulRequests: true,
    }),
    api: limiter(15 * 60_000, config.RATE_LIMIT_API, 'Too many requests. Please slow down.'),
    upload: limiter(60 * 60_000, config.RATE_LIMIT_UPLOAD, 'Upload limit reached. Please try again later.'),
  };
}

export type RateLimiters = ReturnType<typeof createRateLimiters>;
