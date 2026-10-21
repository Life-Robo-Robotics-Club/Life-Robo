import { api, ApiError } from "@/lib/api";
import type { AdminTable, UploadResponse } from "@shared/types";

export { ApiError };

/** Fired whenever an admin call comes back 401 — the app bounces to the login screen. */
export const UNAUTHORIZED_EVENT = "lr-admin-unauthorized";

const signalUnauthorized = () => window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await api<T>(path, { credentials: "same-origin", cache: "no-store", ...init });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && path !== "/api/admin/login") signalUnauthorized();
    throw err;
  }
}

const body = (data: unknown) => JSON.stringify(data);

export const adminApi = {
  get: <T>(path: string, signal?: AbortSignal) => call<T>(path, { signal }),
  post: <T>(path: string, data?: unknown) => call<T>(path, { method: "POST", body: body(data ?? {}) }),
  put: <T>(path: string, data: unknown) => call<T>(path, { method: "PUT", body: body(data) }),
  del: <T = { ok: true }>(path: string) => call<T>(path, { method: "DELETE" }),
};

export const tablePath = (table: AdminTable, id?: number) => `/api/admin/${table}${id != null ? `/${id}` : ""}`;

/* ---------- Errors ---------- */

/** Maps a 400 `issues` array to { "field.path": message }. First message per path wins. */
export function fieldErrors(err: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!(err instanceof ApiError) || !err.issues) return out;
  for (const issue of err.issues) {
    const path = Array.isArray(issue.path) ? issue.path.join(".") : (issue.path ?? "");
    if (!(path in out)) out[path] = issue.message;
  }
  return out;
}

export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Something went wrong. Please try again.";

/* ---------- Uploads ---------- */

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
/** Server limit (D1-backed storage). */
export const MAX_UPLOAD = 5 * 1024 * 1024;
/** Largest original we'll try to decode and compress in the browser. */
const MAX_ORIGINAL = 40 * 1024 * 1024;
const MAX_EDGE = 1920;
const TARGET = 1.5 * 1024 * 1024;
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");
export const UPLOAD_HINT = "JPEG, PNG, WebP, GIF or AVIF. Photos are resized to 1920px and compressed automatically (5 MB max after compression).";

/** Pre-upload check. Returns an error message or null. (Size is re-checked after compression.) */
export function checkImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return `“${file.name}” isn't a JPEG, PNG, WebP, GIF or AVIF image.`;
  if (file.type === "image/gif" && file.size > MAX_UPLOAD)
    return `“${file.name}” is ${fmtBytes(file.size)} — GIFs aren't compressed (to keep animation) and must be 5 MB or smaller.`;
  if (file.size > MAX_ORIGINAL) return `“${file.name}” is ${fmtBytes(file.size)} — too large to process. Use an image under 40 MB.`;
  return null;
}

export function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export interface Compressed {
  file: File;
  originalSize: number;
  size: number;
  /** false when the original was kept (GIF, undecodable, or already smaller). */
  compressed: boolean;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Downscale to a 1920px longest edge and re-encode as WebP (q 0.82, then 0.7 if still > 1.5 MB).
 * Falls back to JPEG where WebP encoding isn't supported. GIFs are left alone to keep animation.
 */
export async function compressImage(file: File): Promise<Compressed> {
  const keep: Compressed = { file, originalSize: file.size, size: file.size, compressed: false };
  if (file.type === "image/gif") return keep;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return keep; // browser can't decode (e.g. AVIF on older browsers) — let the server take the original
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return keep;
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const encode = async (quality: number): Promise<Blob | null> => {
    const webp = await canvasToBlob(canvas, "image/webp", quality);
    if (webp && webp.type === "image/webp") return webp;
    // No WebP encoder: JPEG has no alpha, so paint transparent areas white first.
    const flat = document.createElement("canvas");
    flat.width = w;
    flat.height = h;
    const fctx = flat.getContext("2d");
    if (!fctx) return null;
    fctx.fillStyle = "#fff";
    fctx.fillRect(0, 0, w, h);
    fctx.drawImage(canvas, 0, 0);
    return canvasToBlob(flat, "image/jpeg", quality);
  };

  let blob = await encode(0.82);
  if (blob && blob.size > TARGET) blob = (await encode(0.7)) ?? blob;
  if (!blob) return keep;
  // Keep the original if re-encoding didn't help and it already fits.
  if (blob.size >= file.size && scale === 1 && file.size <= MAX_UPLOAD) return keep;
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const name = file.name.replace(/\.[a-z0-9]+$/i, "") + "." + ext;
  return { file: new File([blob], name, { type: blob.type }), originalSize: file.size, size: blob.size, compressed: true };
}

export interface UploadResult extends UploadResponse {
  originalSize: number;
  size: number;
}

/** "4.2 MB → 380 KB" style label for UI. */
export const sizeLabel = (r: { originalSize: number; size: number }) =>
  r.size < r.originalSize ? `${fmtBytes(r.originalSize)} → ${fmtBytes(r.size)}` : fmtBytes(r.size);

/**
 * Compresses, then uploads via XHR so we can report progress (0–1).
 * `onCompressed` fires once the browser-side compression finishes.
 */
export async function uploadImage(
  original: File,
  onProgress?: (fraction: number) => void,
  onCompressed?: (c: Compressed) => void,
): Promise<UploadResult> {
  const invalid = checkImage(original);
  if (invalid) throw new ApiError(invalid, 415);
  const c = await compressImage(original);
  onCompressed?.(c);
  if (c.size > MAX_UPLOAD)
    throw new ApiError(`“${original.name}” is still ${fmtBytes(c.size)} after compression — images must be 5 MB or smaller.`, 413);
  const res = await new Promise<UploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.withCredentials = true;
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new ApiError("Network error — check your connection and try again.", 0));
    xhr.onload = () => {
      const body = xhr.response as (UploadResponse & { error?: string }) | null;
      if (xhr.status >= 200 && xhr.status < 300 && body?.url) return resolve(body);
      if (xhr.status === 401) signalUnauthorized();
      const fallback =
        xhr.status === 413
          ? "Image must be 5 MB or smaller."
          : xhr.status === 415
            ? "Only JPEG, PNG, WebP, GIF or AVIF images are allowed."
            : `Upload failed (${xhr.status}).`;
      reject(new ApiError(body?.error || fallback, xhr.status));
    };
    const form = new FormData();
    form.append("file", c.file);
    xhr.send(form);
  });
  return { ...res, originalSize: c.originalSize, size: c.size };
}

export interface MediaItem {
  key: string;
  url: string;
  size: number;
  uploaded: string;
}
