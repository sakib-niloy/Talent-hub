// Central error handling. Internal details are logged server-side, never sent to clients.
const multer = require('multer');
const config = require('../config/env');

const MULTER_STATUS = {
  LIMIT_FILE_SIZE: 413,
  LIMIT_FILE_COUNT: 413,
  LIMIT_PART_COUNT: 413,
  LIMIT_FIELD_COUNT: 413,
  LIMIT_FIELD_VALUE: 413,
  LIMIT_FIELD_KEY: 413,
  LIMIT_UNEXPECTED_FILE: 400,
};

const notFound = (req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = 'Internal server error';

  if (err instanceof multer.MulterError) {
    status = MULTER_STATUS[err.code] || 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message;
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  } else if (status < 500 && (err.expose || err.message)) {
    message = err.message;
  }

  if (status >= 500) {
    console.error(`[${req.id}] ${req.method} ${req.originalUrl}`, err);
  }

  if (res.headersSent) return next(err);
  res.status(status).json({ success: false, error: message, requestId: req.id });
};

// Controllers currently return `error.message` / `details` in their own 500 responses.
// In production, replace any 5xx JSON body with a generic message so internal errors
// (SQL errors, stack fragments, validation internals) never reach clients.
// Remove once controllers delegate errors to errorHandler (Phase 2).
const sanitizeServerErrors = (req, res, next) => {
  if (!config.isProduction) return next();
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500) {
      console.error(`[${req.id}] ${req.method} ${req.originalUrl} ->`, res.statusCode, body);
      return originalJson({ success: false, error: 'Internal server error', requestId: req.id });
    }
    return originalJson(body);
  };
  next();
};

module.exports = { notFound, errorHandler, sanitizeServerErrors };
