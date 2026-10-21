import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AttendanceEvent, Certificate, CertificateSendResult, MailStatus, Registration } from "@shared/types";
import type { AppEnv } from "./env";
import { hashIp } from "./auth";
import { BATCH_MAX, certificateMail, confirmationMail, mailConfigured, mailQuota, sendBatch, sendMail } from "./mail";

// Event registration (public), attendance and certificates (admin).
// Mounted in index.ts after the admin auth middleware and before the generic CRUD routes.

export const attendance = new Hono<AppEnv>();

type Row = Record<string, unknown>;

const now = () => new Date().toISOString();
const UPCOMING_GRACE_MS = 6 * 3600_000; // same rule as tables.ts: upcoming until 6h after the end

const issues = (err: z.ZodError) => err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
const invalid = (c: Context<AppEnv>, err: z.ZodError) => c.json({ error: "Invalid input", issues: issues(err) }, 400);

async function readJson(c: Context<AppEnv>): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

const isUniqueError = (err: unknown) => String(err).includes("UNIQUE constraint failed");

const toReg = (r: Row): Registration => ({
  id: Number(r.id),
  eventId: Number(r.event_id),
  name: String(r.name),
  email: String(r.email ?? ""),
  phone: String(r.phone ?? ""),
  course: String(r.course ?? ""),
  source: r.source === "walk_in" ? "walk_in" : "online",
  attended: r.attended === 1,
  attendedAt: (r.attended_at as string | null) ?? null,
  code: String(r.code),
  confirmationSentAt: (r.confirmation_sent_at as string | null) ?? null,
  certificateSentAt: (r.certificate_sent_at as string | null) ?? null,
  emailError: String(r.email_error ?? ""),
  createdAt: String(r.created_at),
});

const isUpcoming = (r: Row) => Date.parse(String(r.ends_at ?? r.starts_at)) >= Date.now() - UPCOMING_GRACE_MS;

const toAttendanceEvent = (r: Row): AttendanceEvent => ({
  id: Number(r.id),
  slug: String(r.slug),
  title: String(r.title),
  startsAt: String(r.starts_at),
  endsAt: (r.ends_at as string | null) ?? null,
  status: isUpcoming(r) ? "upcoming" : "past",
  registrationOpen: r.registration_open === 1,
  registered: Number(r.registered ?? 0),
  present: Number(r.present ?? 0),
  certificatesSent: Number(r.certs ?? 0),
});

const mailStatus = (c: Context<AppEnv>): MailStatus => ({ configured: mailConfigured(c.env) });

// Unambiguous characters only (no 0/O, 1/I/L) so IDs can be read out or typed.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `LR-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

const origin = (c: Context<AppEnv>) => new URL(c.req.url).origin;

// Base shapes without defaults: on updates a default would overwrite fields the client didn't send.
const emailOrEmpty = z.union([z.literal(""), z.email("Please enter a valid email").max(200)]);
const phoneBase = z
  .string()
  .trim()
  .max(20)
  .regex(/^[0-9+\-\s()]*$/, "Digits only");
const optionalEmail = emailOrEmpty.default("");
const phone = phoneBase.default("");

/* ---------- Public: register for an event ---------- */

const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.email("Please enter a valid email").max(200),
  phone,
  course: z.string().trim().max(120).default(""),
  website: z.string().max(200).optional(),
});

attendance.post("/api/events/:slug/register", async (c) => {
  const parsed = registerSchema.safeParse(await readJson(c));
  if (!parsed.success) return invalid(c, parsed.error);
  const data = parsed.data;
  if (data.website) return c.json({ ok: true }, 201); // honeypot

  const db = c.env.DB;
  const ev = await db
    .prepare("SELECT id, slug, title, starts_at, ends_at, venue, registration_open FROM events WHERE slug = ?1 AND published = 1")
    .bind(c.req.param("slug"))
    .first<Row>();
  if (!ev) return c.json({ error: "Event not found" }, 404);
  if (ev.registration_open !== 1 || !isUpcoming(ev)) return c.json({ error: "Registration for this event is closed." }, 403);

  const ip = await hashIp(c);
  const since = new Date(Date.now() - 3600_000).toISOString();
  const recent = await db
    .prepare("SELECT COUNT(*) AS n FROM registrations WHERE ip_hash = ?1 AND created_at > ?2")
    .bind(ip, since)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= 10) return c.json({ error: "Too many registrations from this network. Try again later." }, 429);

  const email = data.email.toLowerCase();
  let row: Row | null = null;
  for (let attempt = 0; attempt < 2 && !row; attempt++) {
    try {
      row = await db
        .prepare(
          "INSERT INTO registrations (event_id, name, email, phone, course, source, code, ip_hash) VALUES (?1, ?2, ?3, ?4, ?5, 'online', ?6, ?7) RETURNING *",
        )
        .bind(ev.id, data.name, email, data.phone, data.course, newCode(), ip)
        .first<Row>();
    } catch (err) {
      if (!isUniqueError(err)) throw err;
      if (String(err).includes("email")) return c.json({ error: "This email is already registered for this event." }, 409);
      // otherwise the random code collided: retry once
    }
  }
  if (!row) throw new Error("Could not create registration");

  const info = { title: String(ev.title), slug: String(ev.slug), startsAt: String(ev.starts_at), venue: String(ev.venue ?? "") };
  const regId = Number(row.id);
  const mail = confirmationMail(origin(c), email, data.name, info);
  c.executionCtx.waitUntil(
    (async () => {
      const error = await sendMail(c.env, mail);
      await db
        .prepare("UPDATE registrations SET confirmation_sent_at = ?1, email_error = ?2 WHERE id = ?3")
        .bind(error ? null : now(), error ?? "", regId)
        .run();
    })(),
  );
  return c.json({ ok: true, emailed: mailConfigured(c.env) }, 201);
});

/* ---------- Public: certificate lookup ---------- */

attendance.get("/api/certificates/:code", async (c) => {
  const code = c.req.param("code").toUpperCase();
  if (!/^LR-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return c.json({ error: "Certificate not found" }, 404);
  const r = await c.env.DB.prepare(
    `SELECT r.code, r.name, r.attended_at, e.title, e.slug, e.starts_at, e.ends_at, e.venue, e.series
       FROM registrations r JOIN events e ON e.id = r.event_id
      WHERE r.code = ?1 AND r.attended = 1`,
  )
    .bind(code)
    .first<Row>();
  if (!r) return c.json({ error: "Certificate not found" }, 404);
  const item: Certificate = {
    code: String(r.code),
    name: String(r.name),
    issuedAt: String(r.attended_at ?? r.starts_at),
    event: {
      title: String(r.title),
      slug: String(r.slug),
      startsAt: String(r.starts_at),
      endsAt: (r.ends_at as string | null) ?? null,
      venue: String(r.venue ?? ""),
      series: String(r.series ?? ""),
    },
  };
  c.header("Cache-Control", "public, max-age=300");
  return c.json({ item });
});

/* ---------- Admin: attendance ---------- */

const EVENT_COUNTS = `SELECT e.id, e.slug, e.title, e.starts_at, e.ends_at, e.registration_open,
    COUNT(r.id) AS registered,
    COALESCE(SUM(r.attended), 0) AS present,
    COALESCE(SUM(CASE WHEN r.certificate_sent_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS certs
  FROM events e LEFT JOIN registrations r ON r.event_id = e.id`;

/** Asks the Apps Script how many emails Gmail will still send today. */
attendance.get("/api/admin/mail-quota", async (c) => c.json({ configured: mailConfigured(c.env), quota: await mailQuota(c.env) }));

attendance.get("/api/admin/attendance", async (c) => {
  const { results } = await c.env.DB.prepare(`${EVENT_COUNTS} GROUP BY e.id ORDER BY e.starts_at DESC`).all<Row>();
  return c.json({ items: results.map(toAttendanceEvent), mail: mailStatus(c) });
});

const eventId = (c: Context<AppEnv>) => {
  const id = Number(c.req.param("eventId"));
  return Number.isInteger(id) && id > 0 ? id : null;
};

async function loadEvent(db: D1Database, id: number) {
  return db.prepare(`${EVENT_COUNTS} WHERE e.id = ?1 GROUP BY e.id`).bind(id).first<Row>();
}

attendance.get("/api/admin/attendance/:eventId", async (c) => {
  const id = eventId(c);
  if (!id) return c.json({ error: "Bad id" }, 400);
  const ev = await loadEvent(c.env.DB, id);
  if (!ev) return c.json({ error: "Event not found" }, 404);
  const { results } = await c.env.DB.prepare("SELECT * FROM registrations WHERE event_id = ?1 ORDER BY name COLLATE NOCASE")
    .bind(id)
    .all<Row>();
  return c.json({ event: toAttendanceEvent(ev), items: results.map(toReg), mail: mailStatus(c) });
});

const walkInSchema = z.object({
  name: z.string().trim().min(1, "Required").max(120),
  email: optionalEmail,
  phone,
  course: z.string().trim().max(120).default(""),
  attended: z.boolean().default(true),
});

/** Add someone at the door. If their email is already on the list, they're just marked present. */
attendance.post("/api/admin/attendance/:eventId", async (c) => {
  const id = eventId(c);
  if (!id) return c.json({ error: "Bad id" }, 400);
  const parsed = walkInSchema.safeParse(await readJson(c));
  if (!parsed.success) return invalid(c, parsed.error);
  const d = parsed.data;
  const db = c.env.DB;
  const exists = await db.prepare("SELECT id FROM events WHERE id = ?1").bind(id).first();
  if (!exists) return c.json({ error: "Event not found" }, 404);

  const email = d.email.toLowerCase();
  if (email) {
    const existing = await db.prepare("SELECT * FROM registrations WHERE event_id = ?1 AND email = ?2").bind(id, email).first<Row>();
    if (existing) {
      const row = d.attended
        ? await db
            .prepare("UPDATE registrations SET attended = 1, attended_at = COALESCE(attended_at, ?1) WHERE id = ?2 RETURNING *")
            .bind(now(), existing.id)
            .first<Row>()
        : existing;
      return c.json({ item: toReg(row!), existing: true });
    }
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const row = await db
        .prepare(
          `INSERT INTO registrations (event_id, name, email, phone, course, source, attended, attended_at, code)
           VALUES (?1, ?2, ?3, ?4, ?5, 'walk_in', ?6, ?7, ?8) RETURNING *`,
        )
        .bind(id, d.name, email, d.phone, d.course, d.attended ? 1 : 0, d.attended ? now() : null, newCode())
        .first<Row>();
      return c.json({ item: toReg(row!), existing: false }, 201);
    } catch (err) {
      if (!isUniqueError(err) || attempt === 1) throw err;
    }
  }
  throw new Error("unreachable");
});

attendance.get("/api/admin/attendance/:eventId/export.csv", async (c) => {
  const id = eventId(c);
  if (!id) return c.json({ error: "Bad id" }, 400);
  const ev = await c.env.DB.prepare("SELECT slug FROM events WHERE id = ?1").bind(id).first<{ slug: string }>();
  if (!ev) return c.json({ error: "Event not found" }, 404);
  const { results } = await c.env.DB.prepare("SELECT * FROM registrations WHERE event_id = ?1 ORDER BY name COLLATE NOCASE")
    .bind(id)
    .all<Row>();
  // Same CSV hardening as the signups export: quote everything, defuse formula-like cells.
  const cell = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;
  const o = origin(c);
  const lines = [
    ["Name", "Email", "Phone", "Year / branch", "Source", "Present", "Checked in", "Registered", "Certificate sent", "Certificate link"]
      .map(cell)
      .join(","),
  ];
  for (const r of results.map(toReg)) {
    lines.push(
      [
        r.name,
        r.email,
        r.phone,
        r.course,
        r.source === "walk_in" ? "Walk-in" : "Online",
        r.attended ? "Yes" : "No",
        r.attendedAt ?? "",
        r.createdAt,
        r.certificateSentAt ?? "",
        r.attended ? `${o}/certificates/${r.code}` : "",
      ]
        .map(cell)
        .join(","),
    );
  }
  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${ev.slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});

const sendSchema = z.object({
  ids: z.array(z.number().int().positive()).max(1000).optional(),
  resend: z.boolean().default(false),
});

/**
 * Emails certificates to present attendees who have an email address. By default only people
 * who haven't been sent one yet; `resend` includes everyone (or just `ids`). Capped at one
 * batch per call so a click never burns the whole daily Gmail quota.
 */
attendance.post("/api/admin/attendance/:eventId/certificates", async (c) => {
  const id = eventId(c);
  if (!id) return c.json({ error: "Bad id" }, 400);
  const parsed = sendSchema.safeParse((await readJson(c)) ?? {});
  if (!parsed.success) return invalid(c, parsed.error);
  if (!mailConfigured(c.env)) return c.json({ error: "Email is not set up yet. Add MAIL_SCRIPT_URL and MAIL_SCRIPT_SECRET." }, 503);
  const db = c.env.DB;
  const ev = await db.prepare("SELECT title, slug, starts_at, venue FROM events WHERE id = ?1").bind(id).first<Row>();
  if (!ev) return c.json({ error: "Event not found" }, 404);

  const { ids, resend } = parsed.data;
  let sql = "SELECT * FROM registrations WHERE event_id = ?1 AND attended = 1 AND email <> ''";
  if (!resend) sql += " AND certificate_sent_at IS NULL";
  if (ids?.length) sql += ` AND id IN (${ids.map(Number).join(",")})`;
  sql += ` ORDER BY id LIMIT ${BATCH_MAX}`;
  const { results } = await db.prepare(sql).bind(id).all<Row>();
  const regs = results.map(toReg);

  const info = { title: String(ev.title), slug: String(ev.slug), startsAt: String(ev.starts_at), venue: String(ev.venue ?? "") };
  const o = origin(c);
  const batch = await sendBatch(
    c.env,
    regs.map((r) => certificateMail(o, r.email, r.name, r.code, info)),
  );

  if (regs.length) {
    const ok = db.prepare("UPDATE registrations SET certificate_sent_at = ?1, email_error = '' WHERE id = ?2");
    const bad = db.prepare("UPDATE registrations SET email_error = ?1 WHERE id = ?2");
    const sentAt = now();
    await db.batch(regs.map((r, i) => (batch.results[i] ? bad.bind(batch.results[i], r.id) : ok.bind(sentAt, r.id))));
  }
  const failed = batch.results.filter(Boolean).length;
  const error = batch.error ?? (failed ? batch.results.find(Boolean)! : null);

  const left = await db
    .prepare("SELECT COUNT(*) AS n FROM registrations WHERE event_id = ?1 AND attended = 1 AND email <> '' AND certificate_sent_at IS NULL")
    .bind(id)
    .first<{ n: number }>();
  const result: CertificateSendResult = {
    sent: regs.length - failed,
    failed,
    remaining: left?.n ?? 0,
    ...(batch.quota != null ? { quota: batch.quota } : {}),
    ...(error ? { error } : {}),
  };
  return c.json(result, batch.error ? 502 : 200);
});

const regId = (c: Context<AppEnv>) => {
  const id = Number(c.req.param("id"));
  return Number.isInteger(id) && id > 0 ? id : null;
};

const updateSchema = z.object({
  name: z.string().trim().min(1, "Required").max(120).optional(),
  email: emailOrEmpty.optional(),
  phone: phoneBase.optional(),
  course: z.string().trim().max(120).optional(),
  attended: z.boolean().optional(),
});

attendance.put("/api/admin/registrations/:id", async (c) => {
  const id = regId(c);
  if (!id) return c.json({ error: "Bad id" }, 400);
  const parsed = updateSchema.safeParse(await readJson(c));
  if (!parsed.success) return invalid(c, parsed.error);
  const d = parsed.data;
  const sets: string[] = [];
  const binds: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    binds.push(v);
    sets.push(`${sql} = ?${binds.length}`);
  };
  if (d.name !== undefined) add("name", d.name);
  if (d.email !== undefined) add("email", d.email.toLowerCase());
  if (d.phone !== undefined) add("phone", d.phone);
  if (d.course !== undefined) add("course", d.course);
  if (d.attended !== undefined) {
    add("attended", d.attended ? 1 : 0);
    add("attended_at", d.attended ? now() : null);
  }
  if (!sets.length) return c.json({ error: "Nothing to update" }, 400);
  binds.push(id);
  try {
    const row = await c.env.DB.prepare(`UPDATE registrations SET ${sets.join(", ")} WHERE id = ?${binds.length} RETURNING *`)
      .bind(...binds)
      .first<Row>();
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json({ item: toReg(row) });
  } catch (err) {
    if (isUniqueError(err)) return c.json({ error: "Someone with this email is already on the list." }, 409);
    throw err;
  }
});

attendance.delete("/api/admin/registrations/:id", async (c) => {
  const id = regId(c);
  if (!id) return c.json({ error: "Bad id" }, 400);
  const res = await c.env.DB.prepare("DELETE FROM registrations WHERE id = ?1").bind(id).run();
  if (!res.meta.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

attendance.post("/api/admin/registrations/:id/confirmation", async (c) => {
  const id = regId(c);
  if (!id) return c.json({ error: "Bad id" }, 400);
  if (!mailConfigured(c.env)) return c.json({ error: "Email is not set up yet. Add MAIL_SCRIPT_URL and MAIL_SCRIPT_SECRET." }, 503);
  const db = c.env.DB;
  const r = await db
    .prepare(
      "SELECT r.id, r.name, r.email, e.title, e.slug, e.starts_at, e.venue FROM registrations r JOIN events e ON e.id = r.event_id WHERE r.id = ?1",
    )
    .bind(id)
    .first<Row>();
  if (!r) return c.json({ error: "Not found" }, 404);
  if (!r.email) return c.json({ error: "This person has no email address." }, 400);
  const info = { title: String(r.title), slug: String(r.slug), startsAt: String(r.starts_at), venue: String(r.venue ?? "") };
  const error = await sendMail(c.env, confirmationMail(origin(c), String(r.email), String(r.name), info));
  const row = await db
    .prepare("UPDATE registrations SET confirmation_sent_at = COALESCE(?1, confirmation_sent_at), email_error = ?2 WHERE id = ?3 RETURNING *")
    .bind(error ? null : now(), error ?? "", id)
    .first<Row>();
  if (error) return c.json({ error }, 502);
  return c.json({ item: toReg(row!) });
});
