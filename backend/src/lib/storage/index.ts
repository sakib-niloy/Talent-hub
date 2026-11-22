import type { Config } from '../../config/env.js';
import { LocalStorage } from './local.js';
import { S3Storage } from './s3.js';
import type { StorageProvider } from './types.js';

export type { StorageProvider } from './types.js';
export { LocalStorage } from './local.js';

export function createStorage(config: Config): StorageProvider {
  if (config.STORAGE_DRIVER === 's3') {
    return new S3Storage({
      endpoint: config.S3_ENDPOINT!,
      region: config.S3_REGION,
      bucket: config.S3_BUCKET!,
      accessKeyId: config.S3_ACCESS_KEY_ID!,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY!,
      publicUrl: config.S3_PUBLIC_URL!,
      forcePathStyle: config.S3_FORCE_PATH_STYLE,
    });
  }
  return new LocalStorage(config.LOCAL_UPLOAD_DIR, config.JWT_SECRET);
}
