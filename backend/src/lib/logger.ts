import { pino } from 'pino';
import type { Config } from '../config/env.js';

export function createLogger(config: Pick<Config, 'LOG_LEVEL' | 'isProduction' | 'isTest'>) {
  return pino({
    level: config.isTest ? 'silent' : config.LOG_LEVEL,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        '*.password',
        '*.passwordHash',
        '*.token',
      ],
      censor: '[redacted]',
    },
    ...(config.isProduction || config.isTest
      ? {}
      : { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } } }),
  });
}

export type Logger = ReturnType<typeof createLogger>;
