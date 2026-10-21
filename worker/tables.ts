import { z } from "zod";
import type { AdminTable } from "@shared/types";

// Column descriptors map camelCase JSON fields to snake_case SQLite columns.
type ColType = "text" | "int" | "bool" | "json" | "nullableText" | "nullableInt" | "date" | "nullableDate";

interface Column {
  key: string;
  col: string;
  type: ColType;
}

export interface TableDef {
  name: AdminTable;
  sql: string;
  columns: Column[];
  schema: z.ZodObject;
  orderBy: string;
  sortable: boolean;
  hasSlug: boolean;
}

const c = (key: string, type: ColType, col?: string): Column => ({
  key,
  col: col ?? key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`),
  type,
});

// Image/link fields accept site-relative paths ("/photos/x.jpg") or absolute http(s) URLs.
const urlish = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//i.test(v) || v.startsWith("mailto:"), {
    message: "Must be empty, a /path, or an http(s) URL",
  });

const text = (max = 500) => z.string().trim().max(max);
const required = (max = 200) => z.string().trim().min(1, "Required").max(max);
const slug = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes");
const date = z
  .string()
  .trim()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid date" });
const nullableDate = z.union([date, z.literal(""), z.null()]).transform((v) => (v ? v : null));

const eventSchema = z.object({
  slug,
  title: required(200),
  startsAt: date,
  endsAt: nullableDate.default(null),
  venue: text(300).default(""),
  summary: text(600).default(""),
  body: text(20000).default(""),
  cover: urlish.default(""),
  coverAlt: text(300).default(""),
  images: z.array(urlish).max(60).default([]),
  registerUrl: urlish.default(""),
  series: z
    .string()
    .trim()
    .toLowerCase()
    .max(40)
    .regex(/^[a-z0-9-]*$/, "Use lowercase letters, numbers and dashes")
    .default(""),
  registrationOpen: z.boolean().default(false),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
});

const projectSchema = z.object({
  slug,
  title: required(200),
  category: text(80).default(""),
  summary: text(600).default(""),
  body: text(20000).default(""),
  cover: urlish.default(""),
  coverAlt: text(300).default(""),
  tags: z.array(text(40)).max(20).default([]),
  links: z.array(z.object({ label: required(80), url: urlish })).max(10).default([]),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  sort: z.number().int().default(0),
});

const teamSchema = z.object({
  name: required(120),
  role: text(120).default(""),
  group: text(60).default("Core"),
  photo: urlish.default(""),
  bio: text(1000).default(""),
  linkedin: urlish.default(""),
  instagram: urlish.default(""),
  github: urlish.default(""),
  active: z.boolean().default(true),
  sort: z.number().int().default(0),
});

const gallerySchema = z.object({
  url: urlish.refine((v) => v !== "", { message: "Required" }),
  caption: text(300).default(""),
  alt: text(300).default(""),
  eventId: z.number().int().positive().nullable().default(null),
  featured: z.boolean().default(false),
  sort: z.number().int().default(0),
});

const postSchema = z.object({
  slug,
  title: required(200),
  publishedAt: date,
  cover: urlish.default(""),
  coverAlt: text(300).default(""),
  excerpt: text(600).default(""),
  body: text(50000).default(""),
  author: text(120).default(""),
  published: z.boolean().default(true),
});

const partnerSchema = z.object({
  name: required(160),
  shortName: text(60).default(""),
  logo: urlish.default(""),
  summary: text(600).default(""),
  body: text(3000).default(""),
  website: urlish.default(""),
  instagram: urlish.default(""),
  linkedin: urlish.default(""),
  onCertificate: z.boolean().default(true),
  active: z.boolean().default(true),
  sort: z.number().int().default(0),
});

const alertSchema = z.object({
  message: required(400),
  linkUrl: urlish.default(""),
  linkLabel: text(60).default(""),
  image: urlish.default(""),
  tone: z.enum(["info", "highlight", "urgent"]).default("info"),
  active: z.boolean().default(true),
  startsAt: nullableDate.default(null),
  endsAt: nullableDate.default(null),
  priority: z.number().int().default(0),
});

export const tables: Record<AdminTable, TableDef> = {
  events: {
    name: "events",
    sql: "events",
    schema: eventSchema,
    orderBy: "starts_at DESC",
    sortable: false,
    hasSlug: true,
    columns: [
      c("slug", "text"),
      c("title", "text"),
      c("startsAt", "date"),
      c("endsAt", "nullableDate"),
      c("venue", "text"),
      c("summary", "text"),
      c("body", "text"),
      c("cover", "text"),
      c("coverAlt", "text"),
      c("images", "json"),
      c("registerUrl", "text"),
      c("series", "text"),
      c("registrationOpen", "bool"),
      c("featured", "bool"),
      c("published", "bool"),
    ],
  },
  projects: {
    name: "projects",
    sql: "projects",
    schema: projectSchema,
    orderBy: "sort ASC, id ASC",
    sortable: true,
    hasSlug: true,
    columns: [
      c("slug", "text"),
      c("title", "text"),
      c("category", "text"),
      c("summary", "text"),
      c("body", "text"),
      c("cover", "text"),
      c("coverAlt", "text"),
      c("tags", "json"),
      c("links", "json"),
      c("featured", "bool"),
      c("published", "bool"),
      c("sort", "int"),
    ],
  },
  team: {
    name: "team",
    sql: "team",
    schema: teamSchema,
    orderBy: "sort ASC, id ASC",
    sortable: true,
    hasSlug: false,
    columns: [
      c("name", "text"),
      c("role", "text"),
      c("group", "text", "grp"),
      c("photo", "text"),
      c("bio", "text"),
      c("linkedin", "text"),
      c("instagram", "text"),
      c("github", "text"),
      c("active", "bool"),
      c("sort", "int"),
    ],
  },
  gallery: {
    name: "gallery",
    sql: "gallery",
    schema: gallerySchema,
    orderBy: "sort ASC, id ASC",
    sortable: true,
    hasSlug: false,
    columns: [
      c("url", "text"),
      c("caption", "text"),
      c("alt", "text"),
      c("eventId", "nullableInt"),
      c("featured", "bool"),
      c("sort", "int"),
    ],
  },
  posts: {
    name: "posts",
    sql: "posts",
    schema: postSchema,
    orderBy: "published_at DESC",
    sortable: false,
    hasSlug: true,
    columns: [
      c("slug", "text"),
      c("title", "text"),
      c("publishedAt", "date"),
      c("cover", "text"),
      c("coverAlt", "text"),
      c("excerpt", "text"),
      c("body", "text"),
      c("author", "text"),
      c("published", "bool"),
    ],
  },
  partners: {
    name: "partners",
    sql: "partners",
    schema: partnerSchema,
    orderBy: "sort ASC, id ASC",
    sortable: true,
    hasSlug: false,
    columns: [
      c("name", "text"),
      c("shortName", "text"),
      c("logo", "text"),
      c("summary", "text"),
      c("body", "text"),
      c("website", "text"),
      c("instagram", "text"),
      c("linkedin", "text"),
      c("onCertificate", "bool"),
      c("active", "bool"),
      c("sort", "int"),
    ],
  },
  alerts: {
    name: "alerts",
    sql: "alerts",
    schema: alertSchema,
    orderBy: "priority DESC, updated_at DESC",
    sortable: false,
    hasSlug: false,
    columns: [
      c("message", "text"),
      c("linkUrl", "text"),
      c("linkLabel", "text"),
      c("image", "text"),
      c("tone", "text"),
      c("active", "bool"),
      c("startsAt", "nullableDate"),
      c("endsAt", "nullableDate"),
      c("priority", "int"),
    ],
  },
};

export const isAdminTable = (name: string): name is AdminTable => name in tables;

type Row = Record<string, unknown>;

const parseJson = (v: unknown): unknown => {
  if (typeof v !== "string") return [];
  try {
    return JSON.parse(v);
  } catch {
    return [];
  }
};

/** D1 row (snake_case, ints for bools, JSON strings) → API object. */
export function fromRow<T>(def: TableDef, row: Row): T {
  const out: Row = { id: row.id, createdAt: row.created_at, updatedAt: row.updated_at };
  for (const col of def.columns) {
    const v = row[col.col];
    switch (col.type) {
      case "bool":
        out[col.key] = v === 1 || v === true;
        break;
      case "json":
        out[col.key] = parseJson(v);
        break;
      case "int":
        out[col.key] = Number(v ?? 0);
        break;
      case "nullableInt":
        out[col.key] = v == null ? null : Number(v);
        break;
      case "nullableText":
      case "nullableDate":
        out[col.key] = v ?? null;
        break;
      default:
        out[col.key] = v ?? "";
    }
  }
  if (def.name === "events") {
    const end = (out.endsAt as string | null) ?? (out.startsAt as string);
    out.status = Date.parse(end) >= Date.now() - 6 * 3600_000 ? "upcoming" : "past";
  }
  return out as T;
}

/** Validated API object → [column, value] pairs ready for binding. */
export function toColumns(def: TableDef, data: Row): [string, unknown][] {
  const pairs: [string, unknown][] = [];
  for (const col of def.columns) {
    if (!(col.key in data)) continue;
    const v = data[col.key];
    switch (col.type) {
      case "bool":
        pairs.push([col.col, v ? 1 : 0]);
        break;
      case "json":
        pairs.push([col.col, JSON.stringify(v ?? [])]);
        break;
      case "date":
        pairs.push([col.col, new Date(v as string).toISOString()]);
        break;
      case "nullableDate":
        pairs.push([col.col, v ? new Date(v as string).toISOString() : null]);
        break;
      default:
        pairs.push([col.col, v ?? null]);
    }
  }
  return pairs;
}
