// Core HTTP hardening: security headers, CORS allow-list, body limits, request IDs.
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('../config/env');

// Tag every request with an ID so errors returned to clients can be correlated with server logs.
const requestId = (req, res, next) => {
  const incoming = req.get('x-request-id');
  req.id = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.set('X-Request-Id', req.id);
  next();
};

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser clients (no Origin header) and explicitly allow-listed origins only.
    if (!origin || config.CORS_ORIGINS.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
  maxAge: 600,
};

// Express 5 leaves req.body undefined when no body parser ran; Express 4 code expects {}.
const ensureBody = (req, res, next) => {
  if (req.body === undefined) req.body = {};
  next();
};

function applySecurity(app) {
  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY);

  app.use(requestId);
  app.use(
    helmet({
      // JSON API: lock everything down. Media under /uploads overrides CORP below.
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'self'"],
        },
      },
      strictTransportSecurity: config.isProduction
        ? { maxAge: 31536000, includeSubDomains: true }
        : false,
      referrerPolicy: { policy: 'no-referrer' },
    })
  );
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(ensureBody);
}

// Headers for user-uploaded files: never executable, never sniffed, embeddable cross-origin.
const uploadsHeaders = (req, res, next) => {
  res.set('Content-Security-Policy', "default-src 'none'; sandbox");
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.set('X-Content-Type-Options', 'nosniff');
  next();
};

module.exports = { applySecurity, uploadsHeaders, corsOptions };
