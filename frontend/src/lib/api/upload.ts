import type { UploadTicket } from "./types";

/**
 * PUT the file to the presigned URL from an UploadTicket, reporting progress (0-1).
 * Uses XMLHttpRequest because fetch() has no upload progress events.
 * Credentials are never sent: object storage authorises via the signed URL.
 */
export function putFile(
  ticket: UploadTicket,
  file: File,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(ticket.upload.method, ticket.upload.url, true);
    xhr.withCredentials = false;
    for (const [k, v] of Object.entries(ticket.upload.headers)) {
      // Browsers set Content-Length themselves and refuse to let scripts set it.
      if (k.toLowerCase() === "content-length") continue;
      xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1);
        resolve();
      } else {
        reject(new Error(`Upload failed (HTTP ${xhr.status}). Please try again.`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed: network error. Please check your connection."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}
