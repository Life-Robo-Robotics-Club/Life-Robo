import type { Settings, SitePayload } from "@shared/types";
import { getEvent, getPost, getProject, getSitePayload, listEvents, listPosts, listProjects } from "./content";

interface PageMeta {
  title: string;
  description: string;
  image: string;
  type: "website" | "article";
  status: 200 | 404;
  noindex: boolean;
  jsonLd?: object;
}

const STATIC_ROUTES: Record<string, { title: string; description?: string }> = {
  "/": { title: "" },
  "/events": { title: "Events", description: "Workshops, lecture series and talks organised by Life Robo." },
  "/projects": { title: "Projects", description: "Robots and builds by Life Robo members." },
  "/team": { title: "Team", description: "The students and mentors behind Life Robo." },
  "/gallery": { title: "Gallery", description: "Moments from Life Robo workshops, lectures and builds." },
  "/blog": { title: "Blog", description: "Notes and highlights from Life Robo sessions." },
  "/collaborations": {
    title: "Collaborations",
    description: "Life Robo works with the IEEE Student Branch, FoET and IEEE Robotics and Automation Society on the Vortex workshop series and more.",
  },
  "/join": { title: "Join", description: "Sign up to build robots with Life Robo." },
  "/contact": { title: "Contact", description: "Get in touch with Life Robo." },
};

const stripMd = (s: string) =>
  s
    .replace(/[#*_>`~[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const clip = (s: string, n = 160) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export async function resolveMeta(db: D1Database, path: string, settings: Settings, origin = ""): Promise<PageMeta> {
  const abs = (u: string) => (u && u.startsWith("/") ? origin + u : u || undefined);
  const base: PageMeta = {
    title: settings.seoTitle || settings.siteName,
    description: settings.seoDescription,
    image: settings.ogImage,
    type: "website",
    status: 200,
    noindex: false,
  };
  const p = path.length > 1 ? path.replace(/\/+$/, "") : path;
  const suffix = ` — ${settings.shortName}`;

  if (p === "/admin" || p.startsWith("/admin/")) {
    return { ...base, title: `Admin${suffix}`, noindex: true };
  }

  const known = STATIC_ROUTES[p];
  if (known) {
    const meta = {
      ...base,
      title: known.title ? `${known.title}${suffix}` : base.title,
      description: known.description ?? base.description,
    };
    if (p === "/") {
      meta.jsonLd = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: settings.siteName,
        alternateName: settings.shortName,
        description: settings.seoDescription,
        logo: abs(settings.logoUrl),
        address: settings.address,
        sameAs: Object.values(settings.socials).filter((v): v is string => !!v && /^https?:/.test(v)),
      };
    }
    return meta;
  }

  // Certificates are personal: render them, but keep them out of search results.
  if (/^\/certificates\/[A-Za-z0-9-]{1,20}$/.test(p)) {
    return { ...base, title: `Certificate${suffix}`, description: `Certificate of participation issued by ${settings.shortName}.`, noindex: true };
  }

  const m = p.match(/^\/(events|projects|blog)\/([a-z0-9-]+)$/);
  if (m) {
    const [, kind, slug] = m;
    if (kind === "events") {
      const e = await getEvent(db, slug);
      if (e) {
        return {
          ...base,
          title: `${e.title}${suffix}`,
          description: clip(e.summary || stripMd(e.body)),
          image: e.cover || base.image,
          type: "article",
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "Event",
            name: e.title,
            startDate: e.startsAt,
            endDate: e.endsAt ?? undefined,
            description: e.summary,
            image: abs(e.cover),
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            location: { "@type": "Place", name: e.venue, address: settings.address },
            organizer: { "@type": "Organization", name: settings.shortName },
          },
        };
      }
    } else if (kind === "projects") {
      const pr = await getProject(db, slug);
      if (pr) {
        return { ...base, title: `${pr.title}${suffix}`, description: clip(pr.summary || stripMd(pr.body)), image: pr.cover || base.image, type: "article" };
      }
    } else {
      const po = await getPost(db, slug);
      if (po) {
        return {
          ...base,
          title: `${po.title}${suffix}`,
          description: clip(po.excerpt || stripMd(po.body)),
          image: po.cover || base.image,
          type: "article",
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: po.title,
            datePublished: po.publishedAt,
            image: abs(po.cover),
            author: { "@type": "Organization", name: po.author || settings.shortName },
          },
        };
      }
    }
  }

  return { ...base, title: `Page not found${suffix}`, status: 404, noindex: true };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// JSON inside <script>: neutralise "</script>" and HTML comment openers.
const safeJson = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

const absolute = (origin: string, u: string) => (u.startsWith("/") ? origin + u : u);

/** Rewrites the SPA shell with per-route meta and inlines the site payload. */
export async function renderShell(shell: Response, db: D1Database, url: URL): Promise<Response> {
  let payload: SitePayload | null = null;
  try {
    payload = await getSitePayload(db);
  } catch (err) {
    console.error("site payload failed", err);
  }
  const isAdmin = url.pathname.startsWith("/admin");
  const settings = payload?.settings;
  const meta = settings ? await resolveMeta(db, url.pathname, settings, url.origin).catch(() => null) : null;

  const headers = new Headers(shell.headers);
  headers.set("Cache-Control", "no-cache");
  headers.delete("Content-Length");
  headers.delete("ETag");
  if (meta?.noindex || isAdmin) headers.set("X-Robots-Tag", "noindex");

  if (!meta) return new Response(shell.body, { status: shell.status, headers });

  const canonical = url.origin + (url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : "/");
  const image = absolute(url.origin, meta.image);
  const tags = [
    `<meta name="description" content="${esc(meta.description)}">`,
    `<link rel="canonical" href="${esc(canonical)}">`,
    `<meta property="og:site_name" content="${esc(settings!.shortName)}">`,
    `<meta property="og:type" content="${meta.type}">`,
    `<meta property="og:title" content="${esc(meta.title)}">`,
    `<meta property="og:description" content="${esc(meta.description)}">`,
    `<meta property="og:url" content="${esc(canonical)}">`,
    image ? `<meta property="og:image" content="${esc(image)}">` : "",
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(meta.title)}">`,
    `<meta name="twitter:description" content="${esc(meta.description)}">`,
    image ? `<meta name="twitter:image" content="${esc(image)}">` : "",
    meta.noindex ? `<meta name="robots" content="noindex">` : "",
    meta.jsonLd ? `<script type="application/ld+json">${safeJson(meta.jsonLd)}</script>` : "",
    // Admin fetches its own data; public pages get the payload inline to skip a round trip.
    payload && !isAdmin ? `<script id="__SITE__" type="application/json">${safeJson(payload)}</script>` : "",
  ]
    .filter(Boolean)
    .join("");

  const rewritten = new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(meta.title);
      },
    })
    .on('meta[name="description"], link[rel="canonical"], meta[property^="og:"], meta[name^="twitter:"]', {
      element(el) {
        el.remove();
      },
    })
    .on("head", {
      element(el) {
        el.append(tags, { html: true });
      },
    })
    .transform(new Response(shell.body, { status: meta.status, headers }));

  return rewritten;
}

export async function sitemap(db: D1Database, origin: string): Promise<Response> {
  const [events, projects, posts] = await Promise.all([listEvents(db), listProjects(db), listPosts(db, 1000)]);
  const urls: { loc: string; lastmod?: string }[] = [
    ...Object.keys(STATIC_ROUTES).map((p) => ({ loc: p })),
    ...events.map((e) => ({ loc: `/events/${e.slug}`, lastmod: e.updatedAt })),
    ...projects.map((p) => ({ loc: `/projects/${p.slug}`, lastmod: p.updatedAt })),
    ...posts.map((p) => ({ loc: `/blog/${p.slug}`, lastmod: p.updatedAt })),
  ];
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${esc(origin + u.loc)}</loc>${u.lastmod ? `<lastmod>${esc(u.lastmod.slice(0, 10))}</lastmod>` : ""}</url>`,
      )
      .join("\n") +
    `\n</urlset>\n`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

export function robots(origin: string): Response {
  const body = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
