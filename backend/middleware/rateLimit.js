// Rate limiters (in-memory store; swap for a Redis store when running multiple instances).
const { rateLimit } = require('express-rate-limit');

const base = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
};

const message = (text) => ({ success: false, error: text });

// Brute-force protection for credential endpoints. Successful logins don't count.
const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: message('Too many authentication attempts. Please try again in 15 minutes.'),
});

// General API ceiling per client.
const apiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 500,
  message: message('Too many requests. Please slow down.'),
});

// Uploads are expensive (disk + bandwidth).
const uploadLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 30,
  message: message('Upload limit reached. Please try again later.'),
});

module.exports = { authLimiter, apiLimiter, uploadLimiter };
