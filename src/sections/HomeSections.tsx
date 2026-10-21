/*
  Home page sections. Each export is self-contained (reads from useSite) so sections can be
  reordered, restyled, or swapped independently as new design references arrive.
*/
import { useRef, useState } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { useSite } from "@/lib/site";
import { cx, fmtDate, fmtTime, safeHref } from "@/lib/format";
import { EventCard, PostCard, ProjectCard } from "@/components/Cards";
import { EmptyState, Img, Reveal, SectionHeader, SmartLink } from "@/components/ui";
import { ArrowRight, Calendar, ChevronLeft, ChevronRight, Clock, Pin } from "@/components/icons";

const MoreLink = ({ to, children }: { to: string; children: string }) => (
  <Link to={to} className="link text-[17px]">
    {children} <ArrowRight size={16} />
  </Link>
);

/* ---------- Alert card (larger home version of the banner, only when the alert has an image) ---------- */
export function AlertCard() {
  const { data } = useSite();
  const a = data?.alert;
  if (!a || !a.image) return null;
  const href = safeHref(a.linkUrl);
  return (
    <section className="container-x -mt-4 mb-8 md:mb-16" aria-label="Announcement">
      <Reveal className="card grid items-center gap-0 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Img src={a.image} alt={a.linkLabel || a.message} aspect="4/3" />
        <div className="p-7 md:p-10">
          <p className="eyebrow !text-accent">Announcement</p>
          <p className="title mt-3">{a.message}</p>
          {href && (
            <SmartLink href={href} className="btn btn-primary mt-6">
              {a.linkLabel || "Learn more"} <ArrowRight size={18} />
            </SmartLink>
          )}
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- Stats + marquee ---------- */
export function StatsMarquee() {
  const { settings } = useSite();
  const words = settings.tracks.length
    ? settings.tracks.map((t) => t.title)
    : ["Robot building", "Embedded systems", "Coding & automation", "Competitions", "Mentorship"];
  return (
    <section aria-label="Club at a glance" className="border-y border-line bg-ink">
      {settings.stats.length > 0 && (
        <div className="container-x grid grid-cols-2 gap-y-10 py-14 md:grid-cols-4 md:py-16">
          {settings.stats.map((s, i) => (
            <Reveal key={i} delay={i * 0.08} className="text-center md:text-left">
              <p className="text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-none tracking-[-0.04em] text-gradient">{s.value}</p>
              <p className="mt-2 text-[15px] text-muted">{s.label}</p>
            </Reveal>
          ))}
        </div>
      )}
      <div className={cx("mask-fade-x overflow-hidden py-6", settings.stats.length > 0 && "border-t border-line")} aria-hidden="true">
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap">
          {[...words, ...words, ...words, ...words].map((w, i) => (
            <span key={i} className="flex items-center gap-12 text-[clamp(1.25rem,2.5vw,2rem)] font-semibold tracking-tight text-fg/25">
              {w} <span className="text-accent/60">✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Statement: big tagline, short blue bar, about copy ---------- */
export function Statement() {
  const { settings } = useSite();
  return (
    <section id="about" className="scroll-mt-20 py-24 md:py-36" aria-labelledby="about-title">
      <div className="container-x grid gap-12 md:grid-cols-12">
        <Reveal className="md:col-span-7">
          <p className="eyebrow">About Life Robo</p>
          <h2 id="about-title" className="mt-5 text-[clamp(2.5rem,6.5vw,5.75rem)] font-semibold uppercase leading-[0.95] tracking-[-0.03em]">
            {settings.tagline.split(/(?<=.)s+/).map((part, i) => (
              <span key={i} className={cx("block", i === 1 && "text-gradient")}>{part}</span>
            ))}
          </h2>
          <span className="mt-8 block h-1 w-16 rounded-full bg-accent" aria-hidden="true" />
        </Reveal>
        <Reveal className="md:col-span-5 md:pt-14" delay={0.12}>
          <p className="text-[clamp(1.25rem,2vw,1.6rem)] font-semibold leading-snug tracking-tight text-fg">{settings.aboutHeading}</p>
          {settings.aboutBody && <p className="mt-5 whitespace-pre-line text-[17px] leading-relaxed text-muted md:text-[19px]">{settings.aboutBody}</p>}
        </Reveal>
        {settings.aboutImage && (
          <Reveal className="md:col-span-12" delay={0.1}>
            <Img src={settings.aboutImage} alt="Life Robo members at a club session" aspect="21/9" className="rounded-[28px]" />
          </Reveal>
        )}
      </div>
    </section>
  );
}

/* ---------- Vision / mission glass card (blue → maroon) ---------- */
export function VisionCard() {
  const { settings } = useSite();
  if (!settings.vision && !settings.mission) return null;
  return (
    <section className="pb-24 md:pb-36" aria-labelledby="vision-title">
      <div className="container-x">
        <Reveal className="relative overflow-hidden rounded-[32px] border border-line-strong p-8 sm:p-12 md:p-16">
          <div className="absolute inset-0 bg-[linear-gradient(125deg,#0b2a6b_0%,#162457_45%,#4a0f24_100%)]" aria-hidden="true" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgb(255_255_255/0.12),transparent_45%)]" aria-hidden="true" />
          <div className="glass absolute inset-0 !bg-white/[0.02]" aria-hidden="true" />
          <div className="relative grid gap-10 md:grid-cols-2 md:gap-16">
            {settings.vision && (
              <div>
                <p className="eyebrow !text-white/70">Our vision</p>
                <h2 id="vision-title" className="mt-4 text-[clamp(1.6rem,3vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-white">{settings.vision}</h2>
              </div>
            )}
            {settings.mission && (
              <div className={cx(!settings.vision && "md:col-span-2")}>
                <p className="eyebrow !text-white/70">Our mission</p>
                {!settings.vision && <h2 id="vision-title" className="sr-only">Our mission</h2>}
                <p className="mt-4 text-[17px] leading-relaxed text-white/80 md:text-[19px]">{settings.mission}</p>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Tracks bento ---------- */
const bentoSpans = [
  "md:col-span-4 md:row-span-2",
  "md:col-span-2",
  "md:col-span-2",
  "md:col-span-3",
  "md:col-span-3",
  "md:col-span-2",
];
export function Tracks() {
  const { settings, data } = useSite();
  if (!settings.tracks.length) return null;
  const bg = data?.gallery?.[0]?.url;
  return (
    <section className="py-24 md:py-36" aria-labelledby="tracks-title">
      <div className="container-x">
        <SectionHeader id="tracks-title" eyebrow="What we do" title={<>Learn it. Build it. <span className="text-gradient">Ship it.</span></>} />
        <div className="grid auto-rows-[minmax(220px,auto)] gap-4 md:grid-cols-6">
          {settings.tracks.map((t, i) => (
            <Reveal key={i} delay={i * 0.06} className={cx("card relative flex flex-col justify-end p-7 md:p-9", bentoSpans[i % bentoSpans.length])}>
              {i === 0 && bg && (
                <>
                  <Img src={bg} alt="" className="!absolute inset-0 opacity-40" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" aria-hidden="true" />
                </>
              )}
              <span className="absolute right-7 top-6 font-mono text-[13px] text-dim">0{i + 1}</span>
              <div className="relative">
                <h3 className={cx("font-semibold tracking-tight", i === 0 ? "text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.05]" : "text-[24px] leading-tight")}>{t.title}</h3>
                <p className={cx("mt-3 text-muted", i === 0 ? "max-w-md text-[17px]" : "text-[15px]")}>{t.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Process: sticky left, scrolling steps right ---------- */
export function Process() {
  const { settings } = useSite();
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const steps = settings.process;
  if (!steps.length) return null;
  return (
    <section className="border-t border-line bg-ink py-24 md:py-36" aria-labelledby="process-title">
      <div className="container-x grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="md:sticky md:top-32">
            <p className="eyebrow">How it works</p>
            <h2 id="process-title" className="headline mt-4">From first spark to the arena.</h2>
            <div className="mt-10 hidden items-end gap-4 md:flex" aria-hidden="true">
              <span className="text-[120px] font-semibold leading-none tracking-[-0.05em] text-gradient tabular-nums">0{active + 1}</span>
              <span className="mb-4 text-dim">/ 0{steps.length}</span>
            </div>
            <div className="mt-6 hidden h-px w-full bg-white/10 md:block" aria-hidden="true">
              <motion.div className="h-full origin-left bg-accent" animate={{ scaleX: (active + 1) / steps.length }} transition={{ duration: reduce ? 0 : 0.5 }} />
            </div>
          </div>
        </div>
        <ol className="space-y-6 md:col-span-6 md:col-start-7 md:space-y-[20vh] md:py-[8vh]">
          {steps.map((s, i) => (
            <motion.li
              key={i}
              onViewportEnter={() => setActive(i)}
              viewport={{ margin: "-45% 0px -45% 0px" }}
              className={cx("card p-8 transition-[opacity,border-color] duration-500 md:p-10", active === i ? "border-line-strong opacity-100" : "md:opacity-40")}
            >
              <p className="font-mono text-[13px] text-accent">Step 0{i + 1}</p>
              <h3 className="mt-3 text-[clamp(1.5rem,2.6vw,2.25rem)] font-semibold leading-tight tracking-tight">{s.title}</h3>
              <p className="mt-3 text-[17px] text-muted">{s.description}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- Featured projects ---------- */
export function FeaturedProjects() {
  const { data } = useSite();
  const items = data?.featuredProjects ?? [];
  if (!items.length) return null;
  return (
    <section className="py-24 md:py-36" aria-labelledby="projects-title">
      <div className="container-x">
        <SectionHeader id="projects-title" eyebrow="Projects" title="Built by members." action={<MoreLink to="/projects">All projects</MoreLink>} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 3).map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08}>
              <ProjectCard project={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Events: featured upcoming card + past ---------- */
export function EventsSection() {
  const { data, settings } = useSite();
  const upcoming = data?.upcomingEvents ?? [];
  const past = (data?.featuredEvents ?? []).filter((e) => e.status === "past").slice(0, 3);
  const next = upcoming[0];
  return (
    <section className="border-t border-line bg-ink py-24 md:py-36" aria-labelledby="events-title">
      <div className="container-x">
        <SectionHeader id="events-title" eyebrow="Events" title="On the calendar." action={<MoreLink to="/events">All events</MoreLink>} />
        {next ? (
          <Reveal>
            <Link to={`/events/${next.slug}`} className="card group grid overflow-hidden md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
              <Img src={next.cover} alt={next.coverAlt || next.title} aspect="4/5" imgClassName="group-hover:scale-[1.03]" />
              <div className="flex flex-col justify-center p-8 md:p-14">
                <span className="w-fit rounded-full bg-accent-strong px-3 py-1 text-[12px] font-medium text-white">Next up</span>
                <h3 className="mt-5 text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.03em]">{next.title}</h3>
                <p className="mt-4 text-[17px] text-muted md:text-[19px]">{next.summary}</p>
                <dl className="mt-8 grid gap-3 text-[15px] sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-fg/85"><Calendar size={16} /><dt className="sr-only">Date</dt><dd>{fmtDate(next.startsAt, { weekday: "short" })}</dd></div>
                  <div className="flex items-center gap-2 text-fg/85"><Clock size={16} /><dt className="sr-only">Time</dt><dd>{fmtTime(next.startsAt)}{next.endsAt ? ` – ${fmtTime(next.endsAt)}` : ""}</dd></div>
                  {next.venue && <div className="flex items-center gap-2 text-fg/85 sm:col-span-2"><Pin size={16} /><dt className="sr-only">Venue</dt><dd>{next.venue}</dd></div>}
                </dl>
                <span className="link mt-8 text-[17px]">Event details <ArrowRight size={16} /></span>
              </div>
            </Link>
          </Reveal>
        ) : (
          <EmptyState
            title="No upcoming events right now"
            body="New workshops and talks are announced on Instagram first — follow us so you don't miss the next one."
            instagram={settings.socials.instagram}
          />
        )}
        {upcoming.length > 1 && (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.slice(1, 4).map((e, i) => (
              <Reveal key={e.id} delay={i * 0.08}><EventCard event={e} /></Reveal>
            ))}
          </div>
        )}
        {past.length > 0 && (
          <>
            <h3 className="mb-6 mt-20 text-[24px] font-semibold tracking-tight">Recently</h3>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((e, i) => (
                <Reveal key={e.id} delay={i * 0.08}><EventCard event={e} /></Reveal>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// Aligns a full-bleed scroller with the 1200px container edge.
const GUTTER = "max(16px, calc((100vw - 1200px) / 2 + 32px))";

/* ---------- Highlights gallery: swipeable snap carousel with pill pagination ---------- */
export function Highlights() {
  const { data } = useSite();
  const items = (data?.gallery ?? []).slice(0, 10);
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const kids = Array.from(el.children) as HTMLElement[];
    const left = el.scrollLeft + el.clientWidth * 0.3;
    let idx = 0;
    kids.forEach((k, i) => {
      if (k.offsetLeft - el.offsetLeft <= left) idx = i;
    });
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) idx = kids.length - 1;
    setActive(idx);
  };
  const go = (i: number) => {
    const el = track.current;
    const kid = el?.children[i] as HTMLElement | undefined;
    if (!el || !kid) return;
    el.scrollTo({ left: kid.offsetLeft - el.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft), behavior: reduce ? "auto" : "smooth" });
  };

  if (!items.length) return null;
  return (
    <section className="py-24 md:py-36" aria-labelledby="highlights-title" aria-roledescription="carousel">
      <div className="container-x">
        <SectionHeader
          id="highlights-title"
          eyebrow="Highlights gallery"
          title="Moments from the lab."
          action={
            <div className="flex items-center gap-4">
              <div className="hidden gap-2 md:flex">
                <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-fg hover:bg-white/[0.14] disabled:opacity-30" onClick={() => go(Math.max(0, active - 1))} disabled={active === 0} aria-label="Previous photo">
                  <ChevronLeft size={20} />
                </button>
                <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08] text-fg hover:bg-white/[0.14] disabled:opacity-30" onClick={() => go(Math.min(items.length - 1, active + 1))} disabled={active === items.length - 1} aria-label="Next photo">
                  <ChevronRight size={20} />
                </button>
              </div>
              <MoreLink to="/gallery">Open gallery</MoreLink>
            </div>
          }
        />
      </div>
      <Reveal>
        <ul
          ref={track}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
          style={{ paddingInline: GUTTER, scrollPaddingInline: GUTTER }}
          tabIndex={0}
          aria-label="Highlight photos — scroll horizontally"
        >
          {items.map((g, i) => (
            <li key={g.id} className="w-[84vw] shrink-0 snap-start sm:w-[560px] lg:w-[680px]" aria-roledescription="slide" aria-label={`${i + 1} of ${items.length}`}>
              <Link to="/gallery" className="group block">
                <Img src={g.url} alt={g.alt || g.caption || "Life Robo event photo"} aspect="3/2" className="rounded-[24px]" imgClassName="group-hover:scale-[1.03]" />
                {g.caption && <p className="mt-3 text-[14px] text-muted">{g.caption}</p>}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex justify-center gap-2" role="tablist" aria-label="Choose photo">
          {items.map((g, i) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Show photo ${i + 1}`}
              onClick={() => go(i)}
              className={cx("h-2 rounded-full transition-all duration-300", i === active ? "w-7 bg-fg" : "w-2 bg-white/25 hover:bg-white/45")}
            />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- Team preview ---------- */
const initials = (name: string) =>
  name
    .split(/s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export function TeamPreview() {
  const { data } = useSite();
  const team = (data?.team ?? []).slice(0, 8);
  if (!team.length) return null;
  return (
    <section className="border-t border-line bg-ink py-24 md:py-36" aria-labelledby="team-title">
      <div className="container-x">
        <SectionHeader id="team-title" eyebrow="The team" title="The people behind the bots." action={<MoreLink to="/team">Meet everyone</MoreLink>} />
        <ul className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {team.map((m, i) => (
            <Reveal as="li" key={m.id} delay={(i % 4) * 0.06} className="text-center">
              {m.photo ? (
                <Img src={m.photo} alt={m.name} aspect="1/1" className="mx-auto w-full max-w-[200px] rounded-full" />
              ) : (
                <div
                  className="mx-auto flex aspect-square w-full max-w-[200px] items-center justify-center rounded-full border border-line bg-[radial-gradient(circle_at_30%_25%,rgb(41_151_255/0.35),rgb(139_92_246/0.15)_55%,#141416)] text-[clamp(1.5rem,4vw,2.5rem)] font-semibold tracking-tight text-fg/90"
                  role="img"
                  aria-label={m.name}
                >
                  {initials(m.name)}
                </div>
              )}
              <p className="mt-4 text-[17px] font-semibold tracking-tight">{m.name}</p>
              <p className="text-[14px] text-muted">{m.role}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Latest posts ---------- */
export function LatestPosts() {
  const { data } = useSite();
  const posts = data?.latestPosts ?? [];
  if (!posts.length) return null;
  return (
    <section className="py-24 md:py-36" aria-labelledby="posts-title">
      <div className="container-x">
        <SectionHeader id="posts-title" eyebrow="From the blog" title="Notes from the workbench." action={<MoreLink to="/blog">All posts</MoreLink>} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.slice(0, 3).map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08}><PostCard post={p} /></Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Join CTA ---------- */
export function JoinCta() {
  const { settings } = useSite();
  return (
    <section className="relative overflow-hidden border-t border-line py-28 md:py-44" aria-labelledby="join-title">
      <div className="tech-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,#000,transparent_70%)]" aria-hidden="true" />
      <div
        className="absolute left-1/2 top-1/2 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[130px]"
        style={{ background: "radial-gradient(closest-side, rgb(41 151 255 / 0.35), rgb(139 92 246 / 0.2), transparent)" }}
        aria-hidden="true"
      />
      <Reveal className="container-x relative text-center">
        <p className="eyebrow">{settings.tagline}</p>
        <h2 id="join-title" className="display mx-auto mt-5 max-w-4xl">
          {settings.joinHeading}
        </h2>
        {settings.joinBody && <p className="mx-auto mt-6 max-w-xl text-lg text-muted md:text-xl">{settings.joinBody}</p>}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/join" className="btn btn-primary">
            {settings.joinOpen ? "Apply to join" : "Register interest"} <ArrowRight size={18} />
          </Link>
          <Link to="/contact" className="btn btn-secondary">Talk to us</Link>
        </div>
      </Reveal>
    </section>
  );
}
