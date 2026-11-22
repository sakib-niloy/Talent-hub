// Central error handling: RFC 9457 problem+json, no internal details leaked to clients.
import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger } from '../lib/logger.js';
import { HttpError, problemBody } from '../lib/errors.js';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).type('application/problem+json').json(problemBody(404, 'Not found', String(req.id)));
};

interface HttpLikeError {
  status?: number;
  statusCode?: number;
  type?: string;
  expose?: boolean;
  message?: string;
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err: unknown, req, res, next) => {
    let status = 500;
    let detail = 'Internal server error';
    let errors: HttpError['errors'];

    if (err instanceof HttpError) {
      status = err.status;
      detail = err.detail;
      errors = err.errors;
      if (err.headers) res.set(err.headers);
    } else if (typeof err === 'object' && err !== null) {
      const e = err as HttpLikeError;
      const s = e.status ?? e.statusCode;
      if (e.type === 'entity.too.large') {
        status = 413;
        detail = 'Request body is too large';
      } else if (e.type === 'entity.parse.failed') {
        status = 400;
        detail = 'Malformed JSON body';
      } else if (s && s >= 400 && s < 500) {
        status = s;
        detail = e.expose && e.message ? e.message : status === 404 ? 'Not found' : 'Bad request';
      }
    }

    if (status >= 500) logger.error({ err, reqId: req.id, method: req.method, url: req.originalUrl }, 'request failed');
    if (res.headersSent) return next(err);
    res.status(status).type('application/problem+json').json(problemBody(status, detail, String(req.id), errors));
  };
}
