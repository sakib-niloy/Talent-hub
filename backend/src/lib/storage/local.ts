// Local-disk storage for development. Mimics presigned uploads: the API issues a short-lived
// signed URL and accepts the raw PUT itself, so the client flow is identical to S3/R2.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import express, { Router } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError, badRequest, forbidden } from '../errors.js';
import { STORAGE_KEY_RE, type StorageProvider } from './types.js';

interface UploadClaims {
  k: string;
  ct: string;
  max: number;
}

const AUDIENCE = 'local-upload';

export class LocalStorage implements StorageProvider {
  readonly name = 'local' as const;
  private readonly root: string;

  constructor(rootDir: string, private readonly secret: string) {
    this.root = path.resolve(rootDir);
    fs.mkdirSync(this.root, { recursive: true });
  }

  private resolve(key: string): string {
    if (!STORAGE_KEY_RE.test(key)) throw badRequest('Invalid storage key');
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw badRequest('Invalid storage key');
    return full;
  }

  async createUpload(key: string, opts: { contentType: string; maxBytes: number; expiresInSeconds: number }) {
    this.resolve(key);
    const claims: UploadClaims = { k: key, ct: opts.contentType, max: opts.maxBytes };
    const token = jwt.sign(claims, this.secret, { algorithm: 'HS256', audience: AUDIENCE, expiresIn: opts.expiresInSeconds });
    return {
      url: `/api/v1/storage/local/${encodeURIComponent(key)}?token=${token}`,
      method: 'PUT' as const,
      headers: { 'Content-Type': opts.contentType },
    };
  }

  async head(key: string) {
    try {
      const stat = await fsp.stat(this.resolve(key));
      return { size: stat.size };
    } catch {
      return null;
    }
  }

  async readStart(key: string, bytes: number) {
    const handle = await fsp.open(this.resolve(key), 'r');
    try {
      const buf = Buffer.alloc(bytes);
      const { bytesRead } = await handle.read(buf, 0, bytes, 0);
      return buf.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  }

  async delete(key: string) {
    await fsp.rm(this.resolve(key), { force: true });
  }

  async put(key: string, body: Buffer) {
    const dest = this.resolve(key);
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.writeFile(dest, body);
  }

  publicUrl(key: string) {
    return `/api/v1/files/${key}`;
  }

  /** Routes: PUT /api/v1/storage/local/:key (signed upload) and GET /api/v1/files/* (static). */
  router(): Router {
    const router = Router();

    router.put('/storage/local/:key', async (req, res) => {
      const key = req.params.key;
      let claims: UploadClaims;
      try {
        claims = jwt.verify(String(req.query.token ?? ''), this.secret, {
          algorithms: ['HS256'],
          audience: AUDIENCE,
        }) as UploadClaims;
      } catch {
        throw forbidden('Upload URL is invalid or expired');
      }
      if (claims.k !== key) throw forbidden('Upload URL does not match this file');
      if ((req.get('content-type') ?? '').split(';')[0]?.trim() !== claims.ct) {
        throw badRequest('Content-Type does not match the upload ticket');
      }
      const declared = Number(req.get('content-length') ?? NaN);
      if (Number.isFinite(declared) && declared > claims.max) throw new HttpError(413, 'File is too large');

      const dest = this.resolve(key);
      await fsp.mkdir(path.dirname(dest), { recursive: true });
      const tmp = `${dest}.${crypto.randomUUID()}.part`;
      let received = 0;
      const limiter = new Transform({
        transform(chunk: Buffer, _enc, cb) {
          received += chunk.length;
          if (received > claims.max) cb(new HttpError(413, 'File is too large'));
          else cb(null, chunk);
        },
      });
      try {
        await pipeline(req, limiter, fs.createWriteStream(tmp, { flags: 'wx' }));
        await fsp.rename(tmp, dest);
      } catch (err) {
        await fsp.rm(tmp, { force: true });
        throw err;
      }
      res.status(200).json({ data: { ok: true, size: received } });
    });

    router.use(
      '/files',
      (_req, res, next) => {
        res.set('Content-Security-Policy', "default-src 'none'; sandbox");
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        next();
      },
      express.static(this.root, { index: false, dotfiles: 'deny', fallthrough: false, maxAge: '7d', immutable: true })
    );

    return router;
  }
}
