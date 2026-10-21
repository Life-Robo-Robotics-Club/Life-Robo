import { z } from "zod";
import type { Settings } from "@shared/types";

const urlish = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//i.test(v) || v.startsWith("mailto:"), {
    message: "Must be empty, a /path, or an http(s) URL",
  });
const text = (max = 500) => z.string().trim().max(max);
const cta = z.object({ label: text(60), href: urlish });

export const settingsSchema = z.object({
  siteName: text(160),
  shortName: text(60),
  tagline: text(200),
  logoUrl: urlish,
  heroEyebrow: text(120),
  heroHeadline: text(160),
  heroSubhead: text(500),
  heroPrimaryCta: cta,
  heroSecondaryCta: cta,
  heroImage: urlish,
  aboutHeading: text(200),
  aboutBody: text(3000),
  aboutImage: urlish,
  vision: text(1000),
  mission: text(1000),
  stats: z.array(z.object({ value: text(20), label: text(60) })).max(8),
  tracks: z.array(z.object({ title: text(80), description: text(300) })).max(12),
  process: z.array(z.object({ title: text(80), description: text(300) })).max(8),
  roboFacts: z.array(text(300)).max(40),
  importantLinks: z.array(z.object({ label: text(80), url: urlish })).max(12),
  socials: z.object({
    instagram: urlish.optional(),
    x: urlish.optional(),
    linkedin: urlish.optional(),
    github: urlish.optional(),
    youtube: urlish.optional(),
    email: text(200).optional(),
  }),
  contactEmail: z.union([z.literal(""), z.email().max(200)]),
  address: text(300),
  joinOpen: z.boolean(),
  joinHeading: text(120),
  joinBody: text(1000),
  seoTitle: text(120),
  seoDescription: text(300),
  ogImage: urlish,
  collabHeading: text(160),
  collabIntro: text(1000),
  collabGoals: z.array(z.object({ title: text(80), description: text(300) })).max(8),
  seriesName: text(60),
  seriesTagline: text(120),
  seriesBody: text(3000),
  seriesKey: z
    .string()
    .trim()
    .toLowerCase()
    .max(40)
    .regex(/^[a-z0-9-]*$/, "Use lowercase letters, numbers and dashes"),
  seriesImages: z.array(urlish).max(40),
  seriesLinks: z.array(z.object({ label: text(60), url: urlish })).max(6),
  certSignatories: z.array(z.object({ name: text(80), title: text(120) })).max(3),
});

// Fallbacks so the site still renders if a key is missing from D1.
export const defaultSettings: Settings = {
  siteName: "Life Robo — Robotics Club, FoET, University of Lucknow",
  shortName: "Life Robo",
  tagline: "Innovate. Build. Compete.",
  logoUrl: "/brand/logo-badge.png",
  heroEyebrow: "Robotics Club · FoET, University of Lucknow",
  heroHeadline: "Where robots are built and ideas come alive.",
  heroSubhead: "",
  heroPrimaryCta: { label: "Join the club", href: "/join" },
  heroSecondaryCta: { label: "Explore events", href: "/events" },
  heroImage: "",
  aboutHeading: "",
  aboutBody: "",
  aboutImage: "",
  vision: "",
  mission: "",
  stats: [],
  tracks: [],
  process: [],
  roboFacts: [],
  importantLinks: [],
  socials: {},
  contactEmail: "",
  address: "",
  joinOpen: true,
  joinHeading: "Build with us.",
  joinBody: "",
  seoTitle: "Life Robo — Robotics Club",
  seoDescription: "",
  ogImage: "/brand/og-default.jpg",
  collabHeading: "Collaborations",
  collabIntro: "",
  collabGoals: [],
  seriesName: "",
  seriesTagline: "",
  seriesBody: "",
  seriesKey: "",
  seriesImages: [],
  seriesLinks: [],
  certSignatories: [],
};

export async function loadSettings(db: D1Database): Promise<Settings> {
  const { results } = await db.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>();
  const out: Record<string, unknown> = { ...defaultSettings };
  for (const { key, value } of results) {
    if (!(key in defaultSettings)) continue;
    try {
      out[key] = JSON.parse(value);
    } catch {
      // keep default on corrupt value
    }
  }
  return out as unknown as Settings;
}

export async function saveSettings(db: D1Database, patch: Partial<Settings>): Promise<void> {
  const stmt = db.prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%fZ','now')) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
  );
  const batch = Object.entries(patch)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => stmt.bind(k, JSON.stringify(v)));
  if (batch.length) await db.batch(batch);
}
