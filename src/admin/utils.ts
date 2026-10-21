import type { Alert } from "@shared/types";

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/, "");
}

export function slugError(slug: string): string | null {
  if (!slug) return "Required";
  if (!SLUG_RE.test(slug)) return "Use lowercase letters, numbers and single dashes (e.g. robo-race-2026)";
  return null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO → value for <input type="datetime-local"> in the browser's local time. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value → ISO string; empty → null. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export const nowIso = () => new Date().toISOString();

export type AlertState = "live" | "scheduled" | "expired" | "off";

export function alertState(a: Pick<Alert, "active" | "startsAt" | "endsAt">, now = Date.now()): AlertState {
  if (!a.active) return "off";
  if (a.startsAt && Date.parse(a.startsAt) > now) return "scheduled";
  if (a.endsAt && Date.parse(a.endsAt) <= now) return "expired";
  return "live";
}

/** Mirrors worker/content.ts getActiveAlert: highest priority, then most recently updated. */
export function pickLiveAlert(alerts: Alert[]): Alert | null {
  const now = Date.now();
  return (
    alerts
      .filter((a) => alertState(a, now) === "live")
      .sort((a, b) => b.priority - a.priority || b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
  );
}

export const SAVED_MESSAGE = "Saved — live on the site within ~30 seconds";

export function stableJson(v: unknown) {
  return JSON.stringify(v);
}

const SERVER_KEYS = new Set(["id", "createdAt", "updatedAt", "status"]);

/** Strips server-managed fields so the object can be sent back as an update body. */
export function toDraft<T extends object>(item: T) {
  return Object.fromEntries(Object.entries(item).filter(([k]) => !SERVER_KEYS.has(k))) as Omit<
    T,
    "id" | "createdAt" | "updatedAt" | "status"
  >;
}

/** How many items were created in the last `days` days. */
export function countSince(items: { createdAt: string }[], days: number) {
  const since = Date.now() - days * 86400_000;
  return items.filter((i) => Date.parse(i.createdAt) >= since).length;
}
