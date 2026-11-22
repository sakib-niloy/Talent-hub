export interface UploadTarget {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
}

export interface StoredObject {
  size: number;
  contentType?: string;
}

/** Storage abstraction. Files are uploaded directly by the browser using a signed URL. */
export interface StorageProvider {
  readonly name: 'local' | 's3';
  createUpload(key: string, opts: { contentType: string; maxBytes: number; expiresInSeconds: number }): Promise<UploadTarget>;
  head(key: string): Promise<StoredObject | null>;
  readStart(key: string, bytes: number): Promise<Buffer>;
  delete(key: string): Promise<void>;
  /** Server-side write (used by maintenance scripts such as the legacy importer). */
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  publicUrl(key: string): string;
}

/** Keys look like "photo/12/1732300000000-<uuid>.jpg". */
export const STORAGE_KEY_RE = /^(photo|audio|video)\/\d+\/\d+-[0-9a-f-]{36}\.[a-z0-9]{2,5}$/;
