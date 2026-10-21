# Life Robo — Robotics Club, FoET, University of Lucknow

The official website of **Life Robo**, the student-led robotics club of the Faculty of Engineering & Technology (FoET), University of Lucknow.
Every piece of content (text, images, events, projects, team, gallery, blog, the top announcement strip, and the logo) can be edited from the built-in admin panel at `/admin`.

- **Frontend:** Vite, React 19, TypeScript, React Router, Tailwind CSS v4, and `motion` for animation.
- **Backend:** a single **Cloudflare Worker** written with Hono. It serves the API and the static SPA, and it injects SEO tags into the HTML.
- **Data:** **Cloudflare D1** (SQLite) holds everything: all text and structured content, plus uploaded images, which are stored in D1 and served at `/media/<key>`. No R2 bucket or payment card is needed.

---

## Architecture

```
┌─────────────── Cloudflare Worker (worker/index.ts, Hono) ────────────────┐
│  /api/*            JSON API (public + /api/admin/* behind session cookie) │
│  /media/*          images stored in D1 (chunked), edge-cached, immutable  │
│  /robots.txt       generated                                              │
│  /sitemap.xml      generated from D1 (events, projects, posts)            │
│  HTML navigations  index.html + HTMLRewriter: per-route <title>, meta,    │
│                    canonical, Open Graph/Twitter, JSON-LD (home), and an  │
│                    inlined <script id="__SITE__"> payload for fast boot.  │
│                    Unknown routes/slugs → HTTP 404 (SPA renders NotFound) │
│  everything else   Static Assets (dist/client) — /assets, /photos, /brand │
└──────────┬───────────────────────────────┬───────────────────────────────┘
           │ D1 binding DB (life-robo-db): content tables + media chunks
```

| Path | What it holds |
| --- | --- |
| `src/main.tsx` | Router, the first-visit loading screen gate, and the site data provider |
| `src/components/` | Layout (top strip, nav, footer), LoadingScreen, RoboBubble, UI kit, cards, icons |
| `src/sections/` | Home page and its self-contained sections (Hero, Statement, Vision, Tracks bento, Process, Events, Highlights carousel, and so on) |
| `src/pages/` | Inner pages: events, projects, team, gallery, blog, join, contact, 404, and the error page |
| `src/admin/` | Admin panel (`/admin/*`) |
| `src/lib/` | API client, data hooks, formatting, markdown (sanitised), and SEO helpers |
| `src/index.css` | Design tokens (`@theme`) and component classes. Re-skin the site from here. |
| `shared/types.ts` | The API contract shared by the Worker and the SPA |
| `worker/` | Worker: routes, auth, content/table mapping, SEO rewriting |
| `migrations/` | D1 schema (`0001_init.sql`), seed content (`0002_seed.sql`), and media storage tables (`0003_media.sql`) |
| `public/photos/` | Optimised seed photos from the old site (real club photos only) |
| `public/brand/` | Club badge cropped from the event poster, favicons, and the default OG image |
| `scripts/prepare-assets.mjs` | One-off script that resized and compressed the photos and generated the badge and favicons |

**Image fields** store a URL string. The value is either a static seed asset (`/photos/...`) or an upload (`/media/<key>`). Uploading an image in the admin panel replaces the value.

**Image uploads live in D1.** There is no R2 bucket. Each upload is base64-encoded and split into chunks below D1’s 2 MB value limit (`worker/media.ts`, `migrations/0003_media.sql`).
- The maximum upload is 5 MB, and the admin panel compresses and resizes images in the browser before uploading.
- `/media/<key>` responses go through the Cloudflare edge cache, so repeat views don’t touch the database.
- D1’s free tier allows 500 MB per database, which is room for hundreds of compressed photos. Delete unused images from the admin media library to reclaim space.

**Caching.** Public GET endpoints send `Cache-Control: public, max-age=30`. After you save in the admin panel, the panel refetches with `no-store`. The public site therefore shows changes within about 30 seconds, and usually immediately.

### What was dropped from the old site
The old Next.js site had two features that are not carried over:
- `/api/run`, which proxied a public code-execution service (Piston).
- An in-browser Monaco code editor.

Both were removed on purpose. An open proxy to a code-execution API is a security and abuse risk, and the feature was out of scope for a club website. The 54 MB `.glb` 3D model was also left out.

---

## Local development

Requirements: Node 20 or newer (tested on Node 24) and npm.

```bash
npm install
cp .dev.vars.example .dev.vars          # then set ADMIN_PASSWORD and SESSION_SECRET
npm run db:migrate:local                # creates the local D1 (.wrangler/) and seeds content
npm run dev                             # Vite + Worker together (via @cloudflare/vite-plugin)
```

Open http://localhost:5173. The admin panel is at http://localhost:5173/admin and uses the `ADMIN_PASSWORD` from `.dev.vars`.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server: SPA with HMR, plus the Worker running in workerd with a local D1 |
| `npm run build` | Type-check and build the client and the Worker into `dist/` |
| `npm run preview` | Build, then serve the production build locally |
| `npm run typecheck` | `tsc -b` across the app, Worker, and config projects |
| `npm run lint` | ESLint |
| `npm run db:migrate:local` / `db:migrate:remote` | Apply `migrations/` to the local or production D1 |
| `npm run deploy` | Build and `wrangler deploy` |

To reset local data, delete `.wrangler/state` and run `npm run db:migrate:local` again.

---

## Deploying to Cloudflare

The remote D1 database `life-robo-db` already exists, and its id is set in `wrangler.jsonc`. If you ever need to recreate it, run `npx wrangler d1 create life-robo-db` and paste the new id into `wrangler.jsonc`.

1. **Log in:** `npx wrangler login`
2. **Apply migrations** (schema, seed content, and media tables). Migrations that are already applied are skipped:
   ```bash
   npm run db:migrate:remote
   ```
3. **Set secrets.** Use a strong password and a long random secret, such as the output of `openssl rand -hex 32`:
   ```bash
   npx wrangler secret put ADMIN_PASSWORD
   npx wrangler secret put SESSION_SECRET
   ```
4. **Deploy:** `npm run deploy`. Wrangler prints the `https://life-robo.<your-subdomain>.workers.dev` URL.
5. **Custom domain (optional).** In the Cloudflare dashboard, go to Workers & Pages → `life-robo` → Settings → Domains & Routes → Add → Custom domain. The domain’s DNS must be on Cloudflare.

Later deploys need only `npm run deploy`. When you add a new SQL file to `migrations/`, run `npm run db:migrate:remote` first.

> Note: `vite build` copies `.dev.vars` into `dist/` for local preview. It is git-ignored, and production uses the secrets set with `wrangler secret put`. Never put production passwords in `.dev.vars`.

---

## Event registration, attendance and certificates

1. In **Events**, open an event and turn on **Register on this site**. Its page then shows a form. Each registrant gets a confirmation email.
2. On the day, open **Attendance → the event** on a phone. Tap people in as they arrive. People who registered can also be found by typing their email into the walk-in form, and anyone who just shows up gets added there.
3. After the event, press **Send certificates**. Everyone marked present who has an email gets a link to `/certificates/<ID>`. That page shows an A4 certificate with the club logo, partner logos, name, event and date. **Download PDF** opens the browser's print dialog, where they choose Save as PDF. Anyone can verify a certificate by its ID.

**Email without a domain.** Mail goes out from the club's Gmail through a small Google Apps Script web app (`scripts/gmail-mailer.gs`). It's free and needs no domain or card. Gmail allows about 100 emails a day, so certificates go out 50 per click and the admin shows how many are left today. To set it up, follow the steps at the top of `scripts/gmail-mailer.gs`, then:

```bash
npx wrangler secret put MAIL_SCRIPT_URL      # the web app URL ending in /exec
npx wrangler secret put MAIL_SCRIPT_SECRET   # same value as SECRET in the script
```

Without these secrets everything still works. Emails are skipped, and certificate links can be copied from the Attendance page.

---

## Using the admin panel

Go to `/admin` and sign in with `ADMIN_PASSWORD`. The session is an HMAC-signed, HttpOnly, Secure, `SameSite=Strict` cookie that lasts 7 days. Mutating requests also have their `Origin` header checked.

| Section | What you can do |
| --- | --- |
| **Dashboard** | Overview counts and recent sign-ups |
| **Alert** | Edit the announcement strip shown at the very top of every page: message, link, link label, image, tone (info, highlight, urgent), active flag, start and end time, and priority. The highest-priority active alert is shown. With no active alert and sign-ups open, a default "Sign-ups are open" join strip appears instead. If an alert has an image, a larger card also appears on the home page. |
| **Site settings** | Every piece of home copy (hero, about, vision and mission, stats, tracks, process steps, Robo-facts), socials, important links, contact email, address, join-form toggle, SEO defaults, and the **logo** |
| **Events / Projects / Team / Gallery / Blog** | List, create, edit, reorder, toggle featured, published, or active, and delete (with confirmation). Body fields are Markdown with a preview. |
| **Signups** | Join-form submissions, with CSV export |
| **Partners** | Organisations shown on `/collaborations` (IEEE SB FoET LU, IEEE RAS). Partners marked *On certificates* print their logo and name on certificates. The page copy, the workshop series (Vortex) and certificate signatories are under **Site content**. |
| **Attendance** | Per event: check people in at the door, add walk-ins, export CSV, and email certificates. Turn on *Register on this site* in an event to show a registration form on its page. |

Every image field has an upload button. Accepted formats are JPEG, PNG, WebP, GIF, and AVIF. Images are compressed in the browser and stored in D1, up to 5 MB each. Each image also has a separate alt text field; please fill it in for accessibility.

---

## Content to confirm with the club ⚠️

The seed content comes from the old site and the event posters. The following items are **unverified** and should be checked and corrected in the admin panel:

- **Team roles and photos**
  - The leads (Amit Chauhan, Ahmad Tarique, Harsh Prajapati, Jatin Pandey, Vineeta, Lakshya Soni) are listed from the old site and have no photos.
  - Separate headshots exist for **Akhand, Angel, Anshika, Ayush, Bushra and Prince**. Their roles are unknown, so they are seeded as "Core Member".
  - The Angel and Prince photos are very low resolution and should be replaced.
  - Surnames, the current term, and LinkedIn, Instagram, and GitHub URLs are missing.
  - Faculty convenors are not seeded. The 2023 Roboeminence poster lists Dr. Kamlesh Tiwari and Dr. Siddharth Singh as program convenors; confirm whether they are current.
- **Stats.** The old site claimed "50+ members / 120+ builders / 18+ podiums", which was unverified and contradictory, and those figures were not used. The seed uses safer, editable numbers that still need confirmation: "1,100+ LinkedIn followers", "2023 · Building since", "10+ sessions & talks", and "Weekly build sessions".
- **"Since 2023"** in the hero badge is inferred from the earliest dated posters (the Oct 2023 introductory workshop and lecture series). Confirm the founding year.
- **Projects.** "Line Following Robot" and "Desktop Robotic Arm" use `team-line-final.jpg` and `team-arduino-arm.jpg` from the old site. Confirm that these are real club builds, and add the real details, members, and links.
- **Robotics Workshop-I** is missing because its date is unknown. Add it once the date is known. The dates of Workshop-II (17 Apr 2026) and Workshop-III (19 Apr 2026) come from LinkedIn.
- **Contact email.** None is set yet. Add it in Site settings to enable the email links in the footer, contact page, and help popover.
- **Socials.** Confirm that the LinkedIn URL (`linkedin.com/in/roboticsclublu`) is the club's page.
- **Registration links.** Events have no `registerUrl`. The posters used QR codes, so add the form URLs where relevant.
- **Gallery captions and alt text** are generic ("Robotics workshop"). Replace them with specific descriptions.
- **Blog.** Seed posts are short recaps based only on poster facts. Replace or extend them.
- **Collaborations (migration 0004).** The IEEE SB and IEEE RAS descriptions are written from their banners. Ask both groups to approve the wording. The Vortex LinkedIn URL (`linkedin.com/company/vortex-life-robo`) is guessed from the poster handle `@vortex-life-robo`. Vortex Workshop 1 (3 Oct 2026, migration 0005) uses the same 1:40 PM slot and a generic FoET venue, because the poster gives neither. Correct them in admin if they differ. Certificate signatories are empty until someone adds them in Site content.

---

## Accessibility and performance notes

- The site has a skip link, semantic landmarks, visible focus rings, a keyboard-operable menu, lightbox, and filters, and an `aria-live` region for form status. All motion respects `prefers-reduced-motion`.
- **Loading screen**
  - It plays on the first visit of each browser session only, never on `/admin`.
  - Progress is tied to real work: the site JSON, web fonts, and the hero image.
  - It has a hard cap of about 2.5 seconds, and Esc skips it.
  - With reduced motion it becomes a simple fade.
  - Page content underneath stays `inert` until the loader finishes.
  - In development, open `/?introhold` to keep the loader on screen for design review.
- Images are lazy-loaded, decoded asynchronously, and given reserved aspect ratios (no layout shift). A fallback placeholder appears if an image fails to load.
