// Image storage in D1. Each file is base64-encoded and split into chunks
// small enough for D1's 2 MB value limit; served responses go through the
// edge cache so repeat views don't touch the database.

const CHUNK_BYTES = 700 * 1024; // raw bytes per chunk (~930 KB as base64)

type B64Uint8 = typeof Uint8Array & { fromBase64?: (s: string) => Uint8Array };
type B64Bytes = Uint8Array & { toBase64?: () => string };

function toBase64(bytes: Uint8Array): string {
  const native = (bytes as B64Bytes).toBase64;
  if (native) return native.call(bytes);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function fromBase64(s: string): Uint8Array {
  const native = (Uint8Array as B64Uint8).fromBase64;
  if (native) return native(s);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sha1Hex(bytes: Uint8Array): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-1", bytes));
  return [...d].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface MediaInfo {
  key: string;
  url: string;
  size: number;
  uploaded: string;
}

export async function putMedia(db: D1Database, key: string, file: File): Promise<void> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const etag = await sha1Hex(bytes);
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK_BYTES) chunks.push(toBase64(bytes.subarray(i, i + CHUNK_BYTES)));

  await db
    .prepare("INSERT INTO media (key, content_type, size, original_name, etag, chunks) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
    .bind(key, file.type, bytes.length, file.name.slice(0, 200), etag, chunks.length)
    .run();
  // One statement per chunk keeps each request well under D1's size limits.
  try {
    for (let i = 0; i < chunks.length; i++) {
      await db.prepare("INSERT INTO media_chunks (key, idx, data) VALUES (?1, ?2, ?3)").bind(key, i, chunks[i]).run();
    }
  } catch (err) {
    await deleteMedia(db, key);
    throw err;
  }
}

export async function deleteMedia(db: D1Database, key: string): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM media_chunks WHERE key = ?1").bind(key),
    db.prepare("DELETE FROM media WHERE key = ?1").bind(key),
  ]);
}

export async function listMedia(db: D1Database): Promise<MediaInfo[]> {
  const { results } = await db
    .prepare("SELECT key, size, created_at FROM media ORDER BY created_at DESC LIMIT 2000")
    .all<{ key: string; size: number; created_at: string }>();
  return results.map((r) => ({ key: r.key, url: `/media/${r.key}`, size: r.size, uploaded: r.created_at }));
}

/** Serves /media/<key>, using the edge cache in front of D1. */
export async function serveMedia(db: D1Database, request: Request, key: string, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).origin + "/media/" + key, { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return conditional(request, cached);

  const meta = await db
    .prepare("SELECT content_type, size, etag, chunks FROM media WHERE key = ?1")
    .bind(key)
    .first<{ content_type: string; size: number; etag: string; chunks: number }>();
  if (!meta) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

  const { results } = await db
    .prepare("SELECT data FROM media_chunks WHERE key = ?1 ORDER BY idx")
    .bind(key)
    .all<{ data: string }>();
  if (results.length !== meta.chunks) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

  const body = new Uint8Array(meta.size);
  let offset = 0;
  for (const { data } of results) {
    const part = fromBase64(data);
    body.set(part, offset);
    offset += part.length;
  }

  const res = new Response(body, {
    headers: {
      "Content-Type": meta.content_type,
      "Content-Length": String(meta.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: `"${meta.etag}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return conditional(request, res);
}

function conditional(request: Request, res: Response): Response {
  const inm = request.headers.get("If-None-Match");
  const etag = res.headers.get("ETag");
  if (inm && etag && inm === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": res.headers.get("Cache-Control") ?? "" } });
  }
  return res;
}

export async function purgeMediaCache(request: Request, key: string): Promise<void> {
  await caches.default.delete(new Request(new URL(request.url).origin + "/media/" + key, { method: "GET" }));
}
