import type { SitePayload } from "@shared/types";

export class ApiError extends Error {
  status: number;
  issues?: { path?: string | (string | number)[]; message: string }[];
  constructor(message: string, status: number, issues?: ApiError["issues"]) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  let res: Response;
  try {
    res = await fetch(path, { credentials: "same-origin", ...init, headers });
  } catch {
    throw new ApiError("Network error — check your connection and try again.", 0);
  }
  const type = res.headers.get("content-type") ?? "";
  const body = type.includes("application/json") ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const msg =
      (body && typeof body.error === "string" && body.error) ||
      (res.status === 429 ? "Too many requests. Please wait a bit and try again." : `Request failed (${res.status})`);
    throw new ApiError(msg, res.status, body?.issues);
  }
  return body as T;
}

export const json = (data: unknown) => JSON.stringify(data);

/** Reads the payload the Worker inlines into <head>, falling back to the API. */
export async function loadSitePayload(fresh = false): Promise<SitePayload> {
  if (!fresh) {
    const el = document.getElementById("__SITE__");
    if (el?.textContent) {
      try {
        const parsed = JSON.parse(el.textContent) as SitePayload;
        el.remove();
        if (parsed && parsed.settings) return parsed;
      } catch {
        /* fall through to network */
      }
    }
  }
  return api<SitePayload>("/api/site", fresh ? { cache: "no-store" } : {});
}
