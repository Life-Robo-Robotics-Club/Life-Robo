import type { Alert, ClubEvent, GalleryImage, Partner, Post, Project, TeamMember } from "@shared/types";
import { fmtDate, fmtTime } from "@/lib/format";
import type { CollectionConfig } from "./Collection";
import { AlertsLiveNow } from "./AlertPreview";
import { GalleryBulk } from "./GalleryBulk";
import { AlertForm, EventForm, GalleryForm, PartnerForm, PostForm, ProjectForm, TeamForm } from "./forms";
import { Badge } from "./ui";
import { alertState, nowIso, slugError } from "./utils";

const slugCheck = (d: { slug: string; title: string }) => {
  const e: Record<string, string> = {};
  if (!d.title.trim()) e.title = "Required";
  const s = slugError(d.slug);
  if (s) e.slug = s;
  return e;
};

const pub = (published: boolean) => (published ? null : <Badge>Draft</Badge>);
const feat = (featured: boolean) => (featured ? <Badge tone="blue">Featured</Badge> : null);

/** A week from now at 17:00 local — a sensible default event slot. */
function nextWeekEvening() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
}

export const eventsConfig: CollectionConfig<ClubEvent> = {
  table: "events",
  base: "/admin/events",
  title: "Events",
  singular: "event",
  subtitle: "Workshops, competitions and meetups. Upcoming vs past is worked out from the dates.",
  blank: () => ({
    slug: "",
    title: "",
    startsAt: nextWeekEvening(),
    endsAt: null,
    venue: "",
    summary: "",
    body: "",
    cover: "",
    coverAlt: "",
    images: [],
    registerUrl: "",
    series: "",
    registrationOpen: false,
    featured: false,
    published: true,
  }),
  label: (d) => d.title,
  thumb: (i) => i.cover,
  badges: (i) => (
    <>
      <Badge tone={i.status === "upcoming" ? "green" : "neutral"}>{i.status === "upcoming" ? "Upcoming" : "Past"}</Badge>
      {pub(i.published)}
      {feat(i.featured)}
      {i.registrationOpen && <Badge tone="blue">Registration</Badge>}
      {i.series && <Badge>{i.series}</Badge>}
    </>
  ),
  meta: (i) => (
    <span>
      {fmtDate(i.startsAt)} · {fmtTime(i.startsAt)}
      {i.venue ? ` · ${i.venue}` : ""}
    </span>
  ),
  search: (i) => `${i.title} ${i.venue} ${i.slug}`,
  quickToggle: { key: "published", label: "Published" },
  validate: (d) => {
    const e = slugCheck(d);
    if (d.endsAt && Date.parse(d.endsAt) < Date.parse(d.startsAt)) e.endsAt = "Ends before it starts";
    return e;
  },
  viewUrl: (d) => (d.published ? `/events/${d.slug}` : null),
  Form: EventForm,
  emptyBody: "Create your first event — it'll appear on the Events page and, if upcoming, on the home page.",
};

export const projectsConfig: CollectionConfig<Project> = {
  table: "projects",
  base: "/admin/projects",
  title: "Projects",
  singular: "project",
  subtitle: "Robots and builds. The order here is the order on the site.",
  sortable: true,
  blank: () => ({
    slug: "",
    title: "",
    category: "",
    summary: "",
    body: "",
    cover: "",
    coverAlt: "",
    tags: [],
    links: [],
    featured: false,
    published: true,
    sort: 0,
  }),
  label: (d) => d.title,
  thumb: (i) => i.cover,
  badges: (i) => (
    <>
      {pub(i.published)}
      {feat(i.featured)}
    </>
  ),
  meta: (i) => <span>{[i.category, i.tags.slice(0, 3).join(", ")].filter(Boolean).join(" · ")}</span>,
  search: (i) => `${i.title} ${i.category} ${i.tags.join(" ")}`,
  quickToggle: { key: "published", label: "Published" },
  validate: (d) => {
    const e = slugCheck(d);
    d.links.forEach((l, i) => {
      if (!l.label.trim()) e[`links.${i}.label`] = "Required";
    });
    return e;
  },
  viewUrl: (d) => (d.published ? `/projects/${d.slug}` : null),
  Form: ProjectForm,
};

export const teamConfig: CollectionConfig<TeamMember> = {
  table: "team",
  base: "/admin/team",
  title: "Team",
  singular: "member",
  subtitle: "Faculty, leads and core members. The order here is the order on the Team page.",
  sortable: true,
  blank: () => ({
    name: "",
    role: "",
    group: "Core",
    photo: "",
    bio: "",
    linkedin: "",
    instagram: "",
    github: "",
    active: true,
    sort: 0,
  }),
  label: (d) => d.name,
  thumb: (i) => i.photo,
  roundThumb: true,
  badges: (i) => (
    <>
      <Badge>{i.group || "—"}</Badge>
      {!i.active && <Badge tone="amber">Hidden</Badge>}
    </>
  ),
  meta: (i) => <span>{i.role}</span>,
  search: (i) => `${i.name} ${i.role} ${i.group}`,
  quickToggle: { key: "active", label: "Active" },
  validate: (d): Record<string, string> => (d.name.trim() ? {} : { name: "Required" }),
  viewUrl: () => "/team",
  Form: TeamForm,
};

export const galleryConfig: CollectionConfig<GalleryImage> = {
  table: "gallery",
  base: "/admin/gallery",
  title: "Gallery",
  singular: "photo",
  subtitle: "Club photos. Featured photos appear on the home page; drag to set the order.",
  sortable: true,
  blank: () => ({ url: "", caption: "", alt: "", eventId: null, featured: false, sort: 0 }),
  label: (d) => d.caption || d.alt || d.url.split("/").pop() || "Photo",
  thumb: (i) => i.url,
  badges: (i) => (
    <>
      {feat(i.featured)}
      {i.eventId != null && <Badge>Event #{i.eventId}</Badge>}
    </>
  ),
  search: (i) => `${i.caption} ${i.alt} ${i.url}`,
  quickToggle: { key: "featured", label: "Featured" },
  validate: (d): Record<string, string> => (d.url.trim() ? {} : { url: "Choose an image" }),
  viewUrl: () => "/gallery",
  Form: GalleryForm,
  ListTop: GalleryBulk,
  emptyBody: "Use Bulk upload above to add a batch of photos at once.",
};

export const postsConfig: CollectionConfig<Post> = {
  table: "posts",
  base: "/admin/blog",
  title: "Blog",
  singular: "post",
  subtitle: "Write-ups, announcements and build logs.",
  blank: () => ({
    slug: "",
    title: "",
    publishedAt: nowIso(),
    cover: "",
    coverAlt: "",
    excerpt: "",
    body: "",
    author: "",
    published: false,
  }),
  label: (d) => d.title,
  thumb: (i) => i.cover,
  badges: (i) => (
    <>
      {pub(i.published)}
      {i.published && Date.parse(i.publishedAt) > Date.now() && <Badge tone="amber">Scheduled</Badge>}
    </>
  ),
  meta: (i) => (
    <span>
      {fmtDate(i.publishedAt)}
      {i.author ? ` · ${i.author}` : ""}
    </span>
  ),
  search: (i) => `${i.title} ${i.author} ${i.excerpt}`,
  quickToggle: { key: "published", label: "Published" },
  validate: slugCheck,
  viewUrl: (d) => (d.published ? `/blog/${d.slug}` : null),
  Form: PostForm,
};

const stateBadge = {
  live: <Badge tone="green">Live</Badge>,
  scheduled: <Badge tone="blue">Scheduled</Badge>,
  expired: <Badge>Expired</Badge>,
  off: <Badge>Off</Badge>,
};

export const alertsConfig: CollectionConfig<Alert> = {
  table: "alerts",
  base: "/admin/alerts",
  title: "Alert banner",
  singular: "alert",
  subtitle: "The strip above the site navigation. Use it for event launches, sign-up drives and deadlines.",
  blank: () => ({
    message: "",
    linkUrl: "",
    linkLabel: "",
    image: "",
    tone: "highlight",
    active: true,
    startsAt: null,
    endsAt: null,
    priority: 0,
  }),
  label: (d) => d.message,
  thumb: (i) => i.image || "/brand/logo-badge.png",
  roundThumb: true,
  badges: (i) => (
    <>
      {stateBadge[alertState(i)]}
      <Badge tone={i.tone === "urgent" ? "red" : i.tone === "highlight" ? "blue" : "neutral"}>{i.tone}</Badge>
    </>
  ),
  meta: (i) => (
    <span>
      Priority {i.priority}
      {i.startsAt ? ` · from ${fmtDate(i.startsAt)} ${fmtTime(i.startsAt)}` : ""}
      {i.endsAt ? ` · until ${fmtDate(i.endsAt)} ${fmtTime(i.endsAt)}` : ""}
    </span>
  ),
  search: (i) => `${i.message} ${i.linkLabel} ${i.linkUrl}`,
  quickToggle: { key: "active", label: "Active" },
  validate: (d) => {
    const e: Record<string, string> = {};
    if (!d.message.trim()) e.message = "Required";
    if (d.startsAt && d.endsAt && Date.parse(d.endsAt) <= Date.parse(d.startsAt)) e.endsAt = "Must be after the start time";
    return e;
  },
  viewUrl: () => "/",
  Form: AlertForm,
  ListTop: AlertsLiveNow,
  emptyBody: "Create an alert to promote an event or a sign-up drive across the whole site.",
};

export const partnersConfig: CollectionConfig<Partner> = {
  table: "partners",
  base: "/admin/partners",
  title: "Partners",
  singular: "partner",
  subtitle: "Organisations on the Collaborations page. Partners marked On certificates also appear on event certificates.",
  sortable: true,
  blank: () => ({
    name: "",
    shortName: "",
    logo: "",
    summary: "",
    body: "",
    website: "",
    instagram: "",
    linkedin: "",
    onCertificate: true,
    active: true,
    sort: 0,
  }),
  label: (d) => d.name,
  thumb: (i) => i.logo,
  badges: (i) => (
    <>
      {i.onCertificate && <Badge tone="blue">On certificates</Badge>}
      {!i.active && <Badge tone="amber">Hidden</Badge>}
    </>
  ),
  meta: (i) => <span>{i.shortName}</span>,
  search: (i) => `${i.name} ${i.shortName}`,
  quickToggle: { key: "active", label: "Active" },
  validate: (d): Record<string, string> => (d.name.trim() ? {} : { name: "Required" }),
  viewUrl: () => "/collaborations",
  Form: PartnerForm,
};
