import type { Alert, ClubEvent, GalleryImage, Partner, Post, Project, SitePayload, TeamMember } from "@shared/types";
import { loadSettings } from "./settings";
import { fromRow, tables } from "./tables";

type Row = Record<string, unknown>;

const nowIso = () => new Date().toISOString();

async function all<T>(db: D1Database, table: keyof typeof tables, sql: string, ...binds: unknown[]): Promise<T[]> {
  const { results } = await db
    .prepare(sql)
    .bind(...binds)
    .all<Row>();
  return results.map((r) => fromRow<T>(tables[table], r));
}

export function listEvents(db: D1Database, status?: string, series?: string): Promise<ClubEvent[]> {
  // An event counts as upcoming until 6h after it ends (or starts, if no end).
  const cutoff = new Date(Date.now() - 6 * 3600_000).toISOString();
  if (series) {
    return all(db, "events", "SELECT * FROM events WHERE published = 1 AND series = ?1 ORDER BY starts_at ASC", series);
  }
  if (status === "upcoming") {
    return all(db, "events", "SELECT * FROM events WHERE published = 1 AND COALESCE(ends_at, starts_at) >= ?1 ORDER BY starts_at ASC", cutoff);
  }
  if (status === "past") {
    return all(db, "events", "SELECT * FROM events WHERE published = 1 AND COALESCE(ends_at, starts_at) < ?1 ORDER BY starts_at DESC", cutoff);
  }
  return all(db, "events", "SELECT * FROM events WHERE published = 1 ORDER BY starts_at DESC");
}

export async function getEvent(db: D1Database, slug: string): Promise<ClubEvent | null> {
  const rows = await all<ClubEvent>(db, "events", "SELECT * FROM events WHERE slug = ?1 AND published = 1", slug);
  return rows[0] ?? null;
}

export function listProjects(db: D1Database, category?: string): Promise<Project[]> {
  if (category) {
    return all(db, "projects", "SELECT * FROM projects WHERE published = 1 AND category = ?1 ORDER BY sort, id", category);
  }
  return all(db, "projects", "SELECT * FROM projects WHERE published = 1 ORDER BY sort, id");
}

export async function getProject(db: D1Database, slug: string): Promise<Project | null> {
  const rows = await all<Project>(db, "projects", "SELECT * FROM projects WHERE slug = ?1 AND published = 1", slug);
  return rows[0] ?? null;
}

export function listTeam(db: D1Database): Promise<TeamMember[]> {
  return all(db, "team", "SELECT * FROM team WHERE active = 1 ORDER BY sort, id");
}

export function listGallery(db: D1Database, featuredOnly = false): Promise<GalleryImage[]> {
  return featuredOnly
    ? all(db, "gallery", "SELECT * FROM gallery WHERE featured = 1 ORDER BY sort, id")
    : all(db, "gallery", "SELECT * FROM gallery ORDER BY sort, id");
}

export function listPartners(db: D1Database): Promise<Partner[]> {
  return all(db, "partners", "SELECT * FROM partners WHERE active = 1 ORDER BY sort, id");
}

export function listPosts(db: D1Database, limit = 100): Promise<Post[]> {
  return all(db, "posts", "SELECT * FROM posts WHERE published = 1 AND published_at <= ?1 ORDER BY published_at DESC LIMIT ?2", nowIso(), limit);
}

export async function getPost(db: D1Database, slug: string): Promise<Post | null> {
  const rows = await all<Post>(db, "posts", "SELECT * FROM posts WHERE slug = ?1 AND published = 1 AND published_at <= ?2", slug, nowIso());
  return rows[0] ?? null;
}

export async function getActiveAlert(db: D1Database): Promise<Alert | null> {
  const now = nowIso();
  const rows = await all<Alert>(
    db,
    "alerts",
    `SELECT * FROM alerts WHERE active = 1
       AND (starts_at IS NULL OR starts_at <= ?1)
       AND (ends_at IS NULL OR ends_at > ?1)
     ORDER BY priority DESC, updated_at DESC LIMIT 1`,
    now,
  );
  return rows[0] ?? null;
}

export async function getSitePayload(db: D1Database): Promise<SitePayload> {
  const [settings, alert, upcomingEvents, featuredEvents, featuredProjects, latestPosts, team, gallery, partners] = await Promise.all([
    loadSettings(db),
    getActiveAlert(db),
    listEvents(db, "upcoming"),
    all<ClubEvent>(db, "events", "SELECT * FROM events WHERE published = 1 AND featured = 1 ORDER BY starts_at DESC LIMIT 6"),
    all<Project>(db, "projects", "SELECT * FROM projects WHERE published = 1 AND featured = 1 ORDER BY sort, id LIMIT 6"),
    listPosts(db, 3),
    listTeam(db),
    listGallery(db, true),
    listPartners(db),
  ]);
  return { settings, alert, upcomingEvents, featuredEvents, featuredProjects, latestPosts, team, gallery, partners };
}
