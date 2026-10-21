import { Hono, type Context } from "hono";
import { z } from "zod";
import type { Signup } from "@shared/types";
import type { AppEnv } from "./env";
import { attendance } from "./attendance";
import { clearSession, hashIp, issueSession, requireAdmin, safeEqual, sameOrigin } from "./auth";
import {
  getEvent,
  getPost,
  getProject,
  getSitePayload,
  listEvents,
  listGallery,
  listPosts,
  listProjects,
  listTeam,
} from "./content";
import { deleteMedia, listMedia, purgeMediaCache, putMedia, serveMedia } from "./media";
import { renderShell, robots, sitemap } from "./seo";
import { loadSettings, saveSettings, settingsSchema } from "./settings";
import { fromRow, isAdminTable, tables, toColumns } from "./tables";

const app = new Hono<AppEnv>();

const PUBLIC_CACHE = "public, max-age=30, stale-while-revalidate=120";
const MAX_UPLOAD = 5 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const issues = (err: z.ZodError) => err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
const invalid = (c: Context<AppEnv>, err: z.ZodError) => c.json({ error: "Invalid input", issues: issues(err) }, 400);

async function readJson(c: Context<AppEnv>): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

// ---------- API: shared middleware ----------

app.use("/api/*", sameOrigin);
app.use("/api/*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  if (!c.res.headers.has("Cache-Control")) c.header("Cache-Control", "no-store");
});

// ---------- API: public ----------

app.get("/api/site", async (c) => {
  c.header("Cache-Control", PUBLIC_CACHE);
  return c.json(await getSitePayload(c.env.DB));
});

app.get("/api/events", async (c) => {
  c.header("Cache-Control", PUBLIC_CACHE);
  const series = c.req.query("series")?.toLowerCase();
  return c.json({ items: await listEvents(c.env.DB, c.req.query("status"), series && /^[a-z0-9-]{1,40}$/.test(series) ? series : undefined) });
});

app.get("/api/events/:slug", async (c) => {
  const item = await getEvent(c.env.DB, c.req.param("slug"));
  if (!item) return c.json({ error: "Event not found" }, 404);
  c.header("Cache-Control", PUBLIC_CACHE);
  return c.json({ item });
});

app.get("/api/projects", async (c) => {
  c.header("Cache-Control", PUBLIC_CACHE);
  return c.json({ items: await listProjects(c.env.DB, c.req.query("category") || undefined) });
});

app.get("/api/projects/:slug", async (c) => {
  const item = await getProject(c.env.DB, c.req.param("slug"));
  if (!item) return c.json({ error: "Project not found" }, 404);
  c.header("Cache-Control", PUBLIC_CACHE);
  return c.json({ item });
});

app.get("/api/team", async (c) => {
  c.header("Cache-Control", PUBLIC_CACHE);
  return c.json({ items: await listTeam(c.env.DB) });
});

app.get("/api/gallery", async (c) => {
  c.header("Cache-Control", PUBLIC_CACHE);
  return c.json({ items: await listGallery(c.env.DB, c.req.query("featured") === "1") });
});

app.get("/api/posts", async (c) => {
  c.header("Cache-Control", PUBLIC_CACHE);
  return c.json({ items: await listPosts(c.env.DB) });
});

app.get("/api/posts/:slug", async (c) => {
  const item = await getPost(c.env.DB, c.req.param("slug"));
  if (!item) return c.json({ error: "Post not found" }, 404);
  c.header("Cache-Control", PUBLIC_CACHE);
  return c.json({ item });
});

const signupSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.email("Please enter a valid email").max(200),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+\-\s()]*$/, "Digits only")
    .default(""),
  course: z.string().trim().max(120).default(""),
  interests: z.string().trim().max(1500).default(""),
  website: z.string().max(200).optional(),
});

app.post("/api/signup", async (c) => {
  const parsed = signupSchema.safeParse(await readJson(c));
  if (!parsed.success) return invalid(c, parsed.error);
  const data = parsed.data;
  // Honeypot: bots fill hidden fields. Pretend success so they don't retry.
  if (data.website) return c.json({ ok: true }, 201);

  const settings = await loadSettings(c.env.DB);
  if (!settings.joinOpen) return c.json({ error: "Sign-ups are closed right now." }, 403);

  const ip = await hashIp(c);
  const since = new Date(Date.now() - 3600_000).toISOString();
  const recent = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM signups WHERE ip_hash = ?1 AND created_at > ?2")
    .bind(ip, since)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= 5) return c.json({ error: "Too many sign-ups from this network. Try again later." }, 429);

  await c.env.DB.prepare("INSERT INTO signups (name, email, phone, course, interests, ip_hash) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
    .bind(data.name, data.email.toLowerCase(), data.phone, data.course, data.interests, ip)
    .run();
  return c.json({ ok: true }, 201);
});

// ---------- API: admin auth ----------

app.post("/api/admin/login", async (c) => {
  const db = c.env.DB;
  const ip = await hashIp(c);
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const attempts = await db
    .prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE ip_hash = ?1 AND created_at > ?2")
    .bind(ip, since)
    .first<{ n: number }>();
  if ((attempts?.n ?? 0) >= 10) return c.json({ error: "Too many attempts. Try again in 15 minutes." }, 429);

  const body = (await readJson(c)) as { password?: unknown } | undefined;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!c.env.ADMIN_PASSWORD) return c.json({ error: "Admin password is not configured" }, 500);

  if (!(await safeEqual(password, c.env.ADMIN_PASSWORD))) {
    await db.batch([
      db.prepare("INSERT INTO login_attempts (ip_hash) VALUES (?1)").bind(ip),
      db.prepare("DELETE FROM login_attempts WHERE created_at < ?1").bind(new Date(Date.now() - 86400_000).toISOString()),
    ]);
    return c.json({ error: "Incorrect password" }, 401);
  }
  await db.prepare("DELETE FROM login_attempts WHERE ip_hash = ?1").bind(ip).run();
  await issueSession(c);
  return c.json({ ok: true });
});

app.post("/api/admin/logout", (c) => {
  clearSession(c);
  return c.json({ ok: true });
});

// Everything below requires a session.
app.use("/api/admin/*", async (c, next) => {
  const p = c.req.path;
  if (p === "/api/admin/login" || p === "/api/admin/logout") return next();
  return requireAdmin(c, next);
});

app.get("/api/admin/me", (c) => c.json({ ok: true }));

// Event registration, certificates (public) and attendance (admin). Must stay above the generic CRUD routes.
app.route("/", attendance);

// ---------- API: admin settings ----------

app.get("/api/admin/settings", async (c) => c.json({ item: await loadSettings(c.env.DB) }));

app.put("/api/admin/settings", async (c) => {
  const parsed = settingsSchema.partial().safeParse(await readJson(c));
  if (!parsed.success) return invalid(c, parsed.error);
  await saveSettings(c.env.DB, parsed.data);
  return c.json({ item: await loadSettings(c.env.DB) });
});

// ---------- API: admin signups ----------

const signupRow = (r: Record<string, unknown>): Signup => ({
  id: Number(r.id),
  name: String(r.name),
  email: String(r.email),
  phone: String(r.phone ?? ""),
  course: String(r.course ?? ""),
  interests: String(r.interests ?? ""),
  createdAt: String(r.created_at),
});

app.get("/api/admin/signups", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM signups ORDER BY created_at DESC LIMIT 5000").all();
  return c.json({ items: results.map(signupRow) });
});

app.get("/api/admin/signups.csv", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM signups ORDER BY created_at DESC").all();
  // Quote every cell; prefix formula-like values so spreadsheets don't execute them.
  const cell = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;
  const lines = [["Date", "Name", "Email", "Phone", "Course", "Interests"].map(cell).join(",")];
  for (const s of results.map(signupRow)) {
    lines.push([s.createdAt, s.name, s.email, s.phone, s.course, s.interests].map(cell).join(","));
  }
  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="life-robo-signups-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});

app.delete("/api/admin/signups/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Bad id" }, 400);
  await c.env.DB.prepare("DELETE FROM signups WHERE id = ?1").bind(id).run();
  return c.json({ ok: true });
});

// ---------- API: admin media (stored in D1) ----------

app.post("/api/admin/upload", async (c) => {
  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return c.json({ error: "Expected multipart form data" }, 400);
  }
  const file = form.get("file");
  if (!file || typeof file === "string") return c.json({ error: "Missing file" }, 400);
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return c.json({ error: "Only JPEG, PNG, WebP, GIF or AVIF images are allowed" }, 415);
  if (file.size > MAX_UPLOAD) return c.json({ error: "Image must be 5 MB or smaller" }, 413);

  const key = `uploads/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  await putMedia(c.env.DB, key, file);
  return c.json({ url: `/media/${key}`, key }, 201);
});

app.get("/api/admin/media", async (c) => c.json({ items: await listMedia(c.env.DB) }));

app.delete("/api/admin/media/*", async (c) => {
  const key = decodeURIComponent(c.req.path.slice("/api/admin/media/".length));
  if (!key.startsWith("uploads/") || key.includes("..")) return c.json({ error: "Bad key" }, 400);
  await deleteMedia(c.env.DB, key);
  await purgeMediaCache(c.req.raw, key);
  return c.json({ ok: true });
});

// ---------- API: admin generic CRUD ----------

app.post("/api/admin/reorder/:table", async (c) => {
  const name = c.req.param("table");
  if (!isAdminTable(name) || !tables[name].sortable) return c.json({ error: "Not sortable" }, 400);
  const parsed = z.object({ ids: z.array(z.number().int().positive()).max(1000) }).safeParse(await readJson(c));
  if (!parsed.success) return invalid(c, parsed.error);
  const db = c.env.DB;
  const stmt = db.prepare(`UPDATE ${tables[name].sql} SET sort = ?1 WHERE id = ?2`);
  if (parsed.data.ids.length) await db.batch(parsed.data.ids.map((id, i) => stmt.bind(i + 1, id)));
  return c.json({ ok: true });
});

app.get("/api/admin/:table", async (c) => {
  const name = c.req.param("table");
  if (!isAdminTable(name)) return c.json({ error: "Not found" }, 404);
  const def = tables[name];
  const { results } = await c.env.DB.prepare(`SELECT * FROM ${def.sql} ORDER BY ${def.orderBy}`).all();
  return c.json({ items: results.map((r) => fromRow(def, r)) });
});

const isUniqueError = (err: unknown) => String(err).includes("UNIQUE constraint failed");

app.post("/api/admin/:table", async (c) => {
  const name = c.req.param("table");
  if (!isAdminTable(name)) return c.json({ error: "Not found" }, 404);
  const def = tables[name];
  const parsed = def.schema.safeParse(await readJson(c));
  if (!parsed.success) return invalid(c, parsed.error);

  const data = parsed.data as Record<string, unknown>;
  if (def.sortable && !data.sort) {
    const max = await c.env.DB.prepare(`SELECT COALESCE(MAX(sort), 0) AS m FROM ${def.sql}`).first<{ m: number }>();
    data.sort = (max?.m ?? 0) + 1;
  }
  const pairs = toColumns(def, data);
  const cols = pairs.map(([col]) => col).join(", ");
  const marks = pairs.map((_, i) => `?${i + 1}`).join(", ");
  try {
    const row = await c.env.DB.prepare(`INSERT INTO ${def.sql} (${cols}) VALUES (${marks}) RETURNING *`)
      .bind(...pairs.map(([, v]) => v))
      .first();
    return c.json({ item: fromRow(def, row!) }, 201);
  } catch (err) {
    if (isUniqueError(err)) return c.json({ error: "That slug is already in use" }, 409);
    throw err;
  }
});

app.put("/api/admin/:table/:id", async (c) => {
  const name = c.req.param("table");
  const id = Number(c.req.param("id"));
  if (!isAdminTable(name)) return c.json({ error: "Not found" }, 404);
  if (!Number.isInteger(id)) return c.json({ error: "Bad id" }, 400);
  const def = tables[name];

  // Partial update: zod defaults must not overwrite omitted fields, so only keep keys the client sent.
  const body = await readJson(c);
  if (!body || typeof body !== "object") return c.json({ error: "Invalid input" }, 400);
  const parsed = def.schema.partial().safeParse(body);
  if (!parsed.success) return invalid(c, parsed.error);
  const sent = new Set(Object.keys(body));
  const data = Object.fromEntries(Object.entries(parsed.data).filter(([k]) => sent.has(k)));

  const pairs = toColumns(def, data);
  if (!pairs.length) return c.json({ error: "Nothing to update" }, 400);
  const sets = pairs.map(([col], i) => `${col} = ?${i + 1}`).join(", ");
  try {
    const row = await c.env.DB.prepare(
      `UPDATE ${def.sql} SET ${sets}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?${pairs.length + 1} RETURNING *`,
    )
      .bind(...pairs.map(([, v]) => v), id)
      .first();
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json({ item: fromRow(def, row) });
  } catch (err) {
    if (isUniqueError(err)) return c.json({ error: "That slug is already in use" }, 409);
    throw err;
  }
});

app.delete("/api/admin/:table/:id", async (c) => {
  const name = c.req.param("table");
  const id = Number(c.req.param("id"));
  if (!isAdminTable(name)) return c.json({ error: "Not found" }, 404);
  if (!Number.isInteger(id)) return c.json({ error: "Bad id" }, 400);
  const res = await c.env.DB.prepare(`DELETE FROM ${tables[name].sql} WHERE id = ?1`).bind(id).run();
  if (!res.meta.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

// ---------- Media from D1 ----------

app.get("/media/*", async (c) => {
  const key = decodeURIComponent(c.req.path.slice("/media/".length));
  if (!key.startsWith("uploads/") || key.includes("..")) return c.text("Not found", 404);
  return serveMedia(c.env.DB, c.req.raw, key, c.executionCtx);
});

// ---------- SEO + SPA shell ----------

app.get("/robots.txt", (c) => robots(new URL(c.req.url).origin));
app.get("/sitemap.xml", (c) => sitemap(c.env.DB, new URL(c.req.url).origin));

app.all("*", async (c) => {
  const res = await c.env.ASSETS.fetch(c.req.raw);
  const type = res.headers.get("Content-Type") ?? "";
  if (c.req.method !== "GET" || !type.includes("text/html")) return res;
  return renderShell(res, c.env.DB, new URL(c.req.url));
});

app.onError((err, c) => {
  console.error(err);
  if (c.req.path.startsWith("/api/")) return c.json({ error: "Something went wrong. Please try again." }, 500);
  return c.text("Something went wrong.", 500);
});

export default app;
