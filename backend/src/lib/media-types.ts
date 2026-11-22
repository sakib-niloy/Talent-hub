// Allowed media types, size limits and magic-byte signatures.
import type { MediaKind } from '../db/schema.js';

const MB = 1024 * 1024;

type Signature = 'jpeg' | 'png' | 'gif' | 'webp' | 'mp3' | 'wav' | 'ogg' | 'flac' | 'isobmff' | 'ebml';

interface KindSpec {
  maxBytes: number;
  types: Record<string, { ext: string; sig: Signature[] }>;
}

export const MEDIA_SPECS: Record<MediaKind, KindSpec> = {
  photo: {
    maxBytes: 10 * MB,
    types: {
      'image/jpeg': { ext: '.jpg', sig: ['jpeg'] },
      'image/png': { ext: '.png', sig: ['png'] },
      'image/webp': { ext: '.webp', sig: ['webp'] },
      'image/gif': { ext: '.gif', sig: ['gif'] },
    },
  },
  audio: {
    maxBytes: 25 * MB,
    types: {
      'audio/mpeg': { ext: '.mp3', sig: ['mp3'] },
      'audio/wav': { ext: '.wav', sig: ['wav'] },
      'audio/x-wav': { ext: '.wav', sig: ['wav'] },
      'audio/ogg': { ext: '.ogg', sig: ['ogg'] },
      'audio/aac': { ext: '.aac', sig: ['mp3', 'isobmff'] }, // ADTS shares the MPEG frame sync
      'audio/mp4': { ext: '.m4a', sig: ['isobmff'] },
      'audio/x-m4a': { ext: '.m4a', sig: ['isobmff'] },
      'audio/flac': { ext: '.flac', sig: ['flac'] },
      'audio/webm': { ext: '.weba', sig: ['ebml'] },
    },
  },
  video: {
    maxBytes: 200 * MB,
    types: {
      'video/mp4': { ext: '.mp4', sig: ['isobmff'] },
      'video/webm': { ext: '.webm', sig: ['ebml'] },
      'video/ogg': { ext: '.ogv', sig: ['ogg'] },
      'video/quicktime': { ext: '.mov', sig: ['isobmff'] },
    },
  },
};

export const SNIFF_BYTES = 64;

const ascii = (buf: Buffer, start: number, text: string) => buf.subarray(start, start + text.length).toString('latin1') === text;

export function detectSignature(buf: Buffer): Signature | undefined {
  if (buf.length < 4) return undefined;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf[0] === 0x89 && ascii(buf, 1, 'PNG')) return 'png';
  if (ascii(buf, 0, 'GIF8')) return 'gif';
  if (ascii(buf, 0, 'RIFF') && ascii(buf, 8, 'WEBP')) return 'webp';
  if (ascii(buf, 0, 'RIFF') && ascii(buf, 8, 'WAVE')) return 'wav';
  if (ascii(buf, 0, 'OggS')) return 'ogg';
  if (ascii(buf, 0, 'fLaC')) return 'flac';
  if (ascii(buf, 4, 'ftyp')) return 'isobmff';
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'ebml';
  if (ascii(buf, 0, 'ID3')) return 'mp3';
  if (buf[0] === 0xff && ((buf[1] ?? 0) & 0xe0) === 0xe0) return 'mp3';
  return undefined;
}

export function matchesDeclaredType(kind: MediaKind, mimeType: string, head: Buffer): boolean {
  const spec = MEDIA_SPECS[kind].types[mimeType];
  const sig = detectSignature(head);
  return Boolean(spec && sig && spec.sig.includes(sig));
}
