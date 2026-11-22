// Hardened multer factory shared by the photo/audio/video routes.
// - MIME allow-list per media kind (no SVG/HTML -> no stored XSS via /uploads)
// - Server-generated random filenames; extension derived from the allowed MIME type,
//   never from the client-supplied filename
// - Per-kind size limits, single file, bounded text fields
// - Absolute destination so the server works regardless of the current working directory
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const MB = 1024 * 1024;

const KINDS = {
  photos: {
    maxBytes: 10 * MB,
    types: {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    },
  },
  audios: {
    maxBytes: 25 * MB,
    types: {
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/wav': '.wav',
      'audio/x-wav': '.wav',
      'audio/wave': '.wav',
      'audio/ogg': '.ogg',
      'audio/aac': '.aac',
      'audio/mp4': '.m4a',
      'audio/x-m4a': '.m4a',
      'audio/flac': '.flac',
      'audio/webm': '.weba',
    },
  },
  videos: {
    maxBytes: 200 * MB,
    types: {
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/ogg': '.ogv',
      'video/quicktime': '.mov',
    },
  },
};

function createUploader(kind) {
  const spec = KINDS[kind];
  if (!spec) throw new Error(`Unknown upload kind: ${kind}`);

  const destination = path.join(UPLOAD_ROOT, kind);
  fs.mkdirSync(destination, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, destination),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${spec.types[file.mimetype]}`),
  });

  const fileFilter = (req, file, cb) => {
    if (Object.hasOwn(spec.types, file.mimetype)) return cb(null, true);
    const err = new Error(`Unsupported file type "${file.mimetype}". Allowed: ${Object.keys(spec.types).join(', ')}`);
    err.status = 415;
    err.expose = true;
    return cb(err);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: spec.maxBytes,
      files: 1,
      fields: 10,
      fieldSize: 10 * 1024, // 10 KB per text field (title/description)
      parts: 12,
    },
  });
}

module.exports = { createUploader, UPLOAD_ROOT };
