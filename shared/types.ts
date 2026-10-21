// Shared API contract between the Worker (worker/) and the SPA (src/).
// JSON shapes only — the Worker maps these to/from D1 rows.

export type ISODate = string;

export interface Stat {
  value: string;
  label: string;
}

export interface Track {
  title: string;
  description: string;
}

export interface Step {
  title: string;
  description: string;
}

export interface SocialLinks {
  instagram?: string;
  x?: string;
  linkedin?: string;
  github?: string;
  youtube?: string;
  email?: string;
}

export interface Settings {
  siteName: string;
  shortName: string;
  tagline: string;
  logoUrl: string;
  heroEyebrow: string;
  heroHeadline: string;
  heroSubhead: string;
  heroPrimaryCta: { label: string; href: string };
  heroSecondaryCta: { label: string; href: string };
  heroImage: string;
  aboutHeading: string;
  aboutBody: string;
  aboutImage: string;
  vision: string;
  mission: string;
  stats: Stat[];
  tracks: Track[];
  process: Step[];
  roboFacts: string[];
  importantLinks: { label: string; url: string }[];
  socials: SocialLinks;
  contactEmail: string;
  address: string;
  joinOpen: boolean;
  joinHeading: string;
  joinBody: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  // Collaborations page
  collabHeading: string;
  collabIntro: string;
  collabGoals: Step[];
  seriesName: string;
  seriesTagline: string;
  seriesBody: string;
  seriesKey: string; // events whose `series` matches are listed as sessions
  seriesImages: string[];
  seriesLinks: { label: string; url: string }[];
  // Certificates
  certSignatories: { name: string; title: string }[];
}

export type AlertTone = "info" | "highlight" | "urgent";

export interface Alert {
  id: number;
  message: string;
  linkUrl: string;
  linkLabel: string;
  image: string;
  tone: AlertTone;
  active: boolean;
  startsAt: ISODate | null;
  endsAt: ISODate | null;
  priority: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type EventStatus = "upcoming" | "past";

export interface ClubEvent {
  id: number;
  slug: string;
  title: string;
  startsAt: ISODate;
  endsAt: ISODate | null;
  venue: string;
  summary: string;
  body: string; // markdown
  cover: string;
  coverAlt: string;
  images: string[];
  registerUrl: string;
  series: string; // e.g. "vortex"; groups workshops of one series
  registrationOpen: boolean; // on-site registration form
  featured: boolean;
  published: boolean;
  status: EventStatus; // computed server-side from dates
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface ProjectLink {
  label: string;
  url: string;
}

export interface Project {
  id: number;
  slug: string;
  title: string;
  category: string;
  summary: string;
  body: string; // markdown
  cover: string;
  coverAlt: string;
  tags: string[];
  links: ProjectLink[];
  featured: boolean;
  published: boolean;
  sort: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  group: string; // e.g. "Faculty", "Leads", "Core"
  photo: string;
  bio: string;
  linkedin: string;
  instagram: string;
  github: string;
  active: boolean;
  sort: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface GalleryImage {
  id: number;
  url: string;
  caption: string;
  alt: string;
  eventId: number | null;
  featured: boolean;
  sort: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Post {
  id: number;
  slug: string;
  title: string;
  publishedAt: ISODate;
  cover: string;
  coverAlt: string;
  excerpt: string;
  body: string; // markdown
  author: string;
  published: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Signup {
  id: number;
  name: string;
  email: string;
  phone: string;
  course: string; // year / branch
  interests: string;
  createdAt: ISODate;
}

export interface Partner {
  id: number;
  name: string;
  shortName: string;
  logo: string;
  summary: string;
  body: string;
  website: string;
  instagram: string;
  linkedin: string;
  onCertificate: boolean;
  active: boolean;
  sort: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type RegistrationSource = "online" | "walk_in";

export interface Registration {
  id: number;
  eventId: number;
  name: string;
  email: string;
  phone: string;
  course: string;
  source: RegistrationSource;
  attended: boolean;
  attendedAt: ISODate | null;
  code: string;
  confirmationSentAt: ISODate | null;
  certificateSentAt: ISODate | null;
  emailError: string;
  createdAt: ISODate;
}

export interface RegistrationInput {
  name: string;
  email: string;
  phone?: string;
  course?: string;
  website?: string; // honeypot
}

export interface AttendanceEvent {
  id: number;
  slug: string;
  title: string;
  startsAt: ISODate;
  endsAt: ISODate | null;
  status: EventStatus;
  registrationOpen: boolean;
  registered: number;
  present: number;
  certificatesSent: number;
}

export interface MailStatus {
  configured: boolean;
}

export interface CertificateSendResult {
  sent: number;
  failed: number;
  remaining: number; // present attendees with an email who still have no certificate
  quota?: number; // emails Gmail will still send today
  error?: string;
}

export interface Certificate {
  code: string;
  name: string;
  issuedAt: ISODate;
  event: { title: string; slug: string; startsAt: ISODate; endsAt: ISODate | null; venue: string; series: string };
}

export interface SignupInput {
  name: string;
  email: string;
  phone?: string;
  course?: string;
  interests?: string;
  website?: string; // honeypot — must be empty
}

export interface SitePayload {
  settings: Settings;
  alert: Alert | null;
  upcomingEvents: ClubEvent[];
  featuredEvents: ClubEvent[];
  featuredProjects: Project[];
  latestPosts: Post[];
  team: TeamMember[];
  gallery: GalleryImage[];
  partners: Partner[];
}

export interface ListResponse<T> {
  items: T[];
}

export interface ItemResponse<T> {
  item: T;
}

export interface ErrorResponse {
  error: string;
  issues?: unknown;
}

export interface UploadResponse {
  url: string;
  key: string;
}

// Body for admin create/update: the item minus server-managed fields.
export type Editable<T> = Omit<T, "id" | "createdAt" | "updatedAt" | "status">;

export type AdminTable = "events" | "projects" | "team" | "gallery" | "posts" | "alerts" | "partners";
