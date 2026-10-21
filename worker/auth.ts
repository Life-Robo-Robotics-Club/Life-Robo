import type { Context, MiddlewareHandler } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { AppEnv } from "./env";

export const SESSION_COOKIE = "lr_session";
const SESSION_TTL_S = 7 * 24 * 3600;

const enc = new TextEncoder();

const b64url = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

/** Constant-time string compare via hashing both sides to equal length. */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0 && a.length === b.length;
}

export async function hashIp(c: Context<AppEnv>): Promise<string> {
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "local";
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(`${ip}|${c.env.SESSION_SECRET}`));
  return b64url(digest).slice(0, 32);
}

export async function issueSession(c: Context<AppEnv>): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_S;
  const payload = `v1.${exp}`;
  const sig = await hmac(c.env.SESSION_SECRET, payload);
  setCookie(c, SESSION_COOKIE, `${payload}.${sig}`, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Strict",
    path: "/",
    maxAge: SESSION_TTL_S,
  });
}

export function clearSession(c: Context<AppEnv>): void {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

export async function hasValidSession(c: Context<AppEnv>): Promise<boolean> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token || !c.env.SESSION_SECRET) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const expected = await hmac(c.env.SESSION_SECRET, `${parts[0]}.${parts[1]}`);
  return safeEqual(expected, parts[2]);
}

/** Reject cross-site mutating requests. Browsers always send Origin on POST/PUT/DELETE. */
export const sameOrigin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    const origin = c.req.header("origin");
    if (origin && origin !== new URL(c.req.url).origin) {
      return c.json({ error: "Cross-origin request blocked" }, 403);
    }
  }
  await next();
};

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!(await hasValidSession(c))) return c.json({ error: "Unauthorized" }, 401);
  await next();
};
