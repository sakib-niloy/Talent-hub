import type { MediaKind } from "./api/types";

const MB = 1024 * 1024;

/** Upload limits from docs/API.md. The server re-validates everything. */
export const MEDIA_RULES: Record<MediaKind, { maxBytes: number; types: string[]; label: string }> = {
  photo: {
    maxBytes: 10 * MB,
    types: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    label: "JPG, PNG, WebP or GIF up to 10 MB",
  },
  audio: {
    maxBytes: 25 * MB,
    types: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/ogg", "audio/aac", "audio/mp4", "audio/x-m4a", "audio/flac", "audio/webm"],
    label: "MP3, WAV, OGG, AAC, M4A, FLAC or WebM up to 25 MB",
  },
  video: {
    maxBytes: 200 * MB,
    types: ["video/mp4", "video/webm", "video/ogg", "video/quicktime"],
    label: "MP4, WebM, OGG or MOV up to 200 MB",
  },
};

export const ACCEPT_ATTR = Object.values(MEDIA_RULES)
  .flatMap((r) => r.types)
  .join(",");

export function kindForMime(mime: string): MediaKind | null {
  for (const [kind, rule] of Object.entries(MEDIA_RULES) as [MediaKind, (typeof MEDIA_RULES)[MediaKind]][]) {
    if (rule.types.includes(mime)) return kind;
  }
  return null;
}

export type FileCheck = { ok: true; kind: MediaKind } | { ok: false; error: string };

export function checkFile(file: File): FileCheck {
  const kind = kindForMime(file.type);
  if (!kind) {
    return {
      ok: false,
      error: `“${file.name}” isn't a supported photo, audio or video format.`,
    };
  }
  const rule = MEDIA_RULES[kind];
  if (file.size > rule.maxBytes) {
    return { ok: false, error: `That ${kind} is ${formatBytes(file.size)}. The limit is ${formatBytes(rule.maxBytes)}.` };
  }
  if (file.size === 0) return { ok: false, error: "That file is empty." };
  return { ok: true, kind };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / MB).toFixed(bytes < 10 * MB ? 1 : 0)} MB`;
}
