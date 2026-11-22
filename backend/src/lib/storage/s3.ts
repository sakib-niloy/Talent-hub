// S3-compatible object storage: Cloudflare R2 (recommended), Supabase Storage, Backblaze B2, AWS S3.
// Browsers upload directly with presigned PUT URLs; the API never proxies media bytes.
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { STORAGE_KEY_RE, type StorageProvider } from './types.js';
import { badRequest } from '../errors.js';

export interface S3Options {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
  forcePathStyle: boolean;
}

export class S3Storage implements StorageProvider {
  readonly name = 's3' as const;
  private readonly client: S3Client;

  constructor(private readonly opts: S3Options) {
    this.client = new S3Client({
      region: opts.region,
      endpoint: opts.endpoint,
      forcePathStyle: opts.forcePathStyle,
      credentials: { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey },
      // Newer SDKs add CRC checksum headers by default, which browsers can't reproduce on a
      // presigned PUT and which R2/Supabase may reject. Only send checksums when required.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  private check(key: string) {
    if (!STORAGE_KEY_RE.test(key)) throw badRequest('Invalid storage key');
    return key;
  }

  async createUpload(key: string, opts: { contentType: string; maxBytes: number; expiresInSeconds: number }) {
    const command = new PutObjectCommand({ Bucket: this.opts.bucket, Key: this.check(key), ContentType: opts.contentType });
    const url = await getSignedUrl(this.client, command, { expiresIn: opts.expiresInSeconds });
    // Size is enforced on /complete (HEAD + delete if too large); stale pending uploads are swept.
    return { url, method: 'PUT' as const, headers: { 'Content-Type': opts.contentType } };
  }

  async head(key: string) {
    try {
      const out = await this.client.send(new HeadObjectCommand({ Bucket: this.opts.bucket, Key: this.check(key) }));
      return { size: Number(out.ContentLength ?? 0), contentType: out.ContentType };
    } catch (err) {
      const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404 || (err as Error).name === 'NotFound') return null;
      throw err;
    }
  }

  async readStart(key: string, bytes: number) {
    const out = await this.client.send(
      new GetObjectCommand({ Bucket: this.opts.bucket, Key: this.check(key), Range: `bytes=0-${bytes - 1}` })
    );
    const arr = (await out.Body?.transformToByteArray()) ?? new Uint8Array();
    return Buffer.from(arr);
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.opts.bucket, Key: this.check(key) }));
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.opts.bucket, Key: this.check(key), Body: body, ContentType: contentType })
    );
  }

  publicUrl(key: string) {
    return `${this.opts.publicUrl.replace(/\/+$/, '')}/${key}`;
  }
}
