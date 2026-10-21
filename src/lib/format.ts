const tz = "Asia/Kolkata";

export function fmtDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: tz, ...opts }).format(d);
}

export function fmtTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz }).format(d).toUpperCase();
}

export function dateParts(iso: string) {
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { timeZone: tz, ...o }).format(d);
  return { day: f({ day: "2-digit" }), month: f({ month: "short" }).toUpperCase(), year: f({ year: "numeric" }) };
}

export function isExternal(href: string) {
  return /^(https?:)?\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");
}

/** Only allow safe, real links: http(s), mailto, tel, or site-relative paths. Never "#". */
export function safeHref(href: string | null | undefined): string | null {
  if (!href) return null;
  const h = href.trim();
  if (!h || h === "#") return null;
  if (h.startsWith("/") && !h.startsWith("//")) return h;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(h)) return h;
  return null;
}

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
