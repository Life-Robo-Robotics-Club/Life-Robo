import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { SocialLinks } from "@shared/types";
import { useSite } from "@/lib/site";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { cx, fmtDate, isExternal, safeHref } from "@/lib/format";
import { Badge, Wordmark } from "./Brand";
import { ArrowRight, ArrowUpRight, Close, GitHub, Instagram, LinkedIn, Mail, Menu, XLogo, YouTube } from "./icons";
import { SmartLink } from "./ui";
import { RoboBubble } from "./RoboBubble";

// eslint-disable-next-line react-refresh/only-export-components
export const NAV = [
  { to: "/events", label: "Events" },
  { to: "/projects", label: "Projects" },
  { to: "/team", label: "Team" },
  { to: "/collaborations", label: "Collaborations" },
  { to: "/gallery", label: "Gallery" },
  { to: "/blog", label: "Blog" },
  { to: "/contact", label: "Contact" },
];

/* ---------------- Top strip (event alert or default join call-to-action) ---------------- */

interface StripData {
  key: string;
  message: string;
  href: string;
  label: string;
  image: string;
  tone: "info" | "highlight" | "urgent";
}

// Dismissal lasts for the current visit only, so returning visitors always see the latest strip.
function readDismissed(key: string) {
  try {
    return !!sessionStorage.getItem(key);
  } catch {
    return false;
  }
}

const toneClass: Record<StripData["tone"], string> = {
  highlight: "bg-[linear-gradient(90deg,#24086e_0%,#3a0ca3_55%,#1e3a8a_100%)]",
  urgent: "bg-[linear-gradient(90deg,#7f1d1d_0%,#b42318_60%,#c2410c_100%)]",
  info: "bg-elev-2",
};

/** Slim, full-width, fully clickable strip ABOVE the nav. Scrolls away; nav then sticks. */
function TopStrip() {
  const { data, settings } = useSite();
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  let strip: StripData | null = null;
  const a = data?.alert;
  if (a && safeHref(a.linkUrl || "/events")) {
    strip = {
      key: `lr-strip-alert-${a.id}-${a.updatedAt}`,
      message: a.message,
      href: safeHref(a.linkUrl) ?? "/events",
      label: a.linkLabel || "Learn more",
      image: a.image,
      tone: a.tone,
    };
  } else if (data?.upcomingEvents?.length) {
    const ev = data.upcomingEvents[0];
    strip = {
      key: `lr-strip-event-${ev.id}-${ev.updatedAt}`,
      message: `Upcoming: ${ev.title} — ${fmtDate(ev.startsAt, { day: "numeric", month: "short" })}. Register now.`,
      href: `/events/${ev.slug}`,
      label: "See details",
      image: ev.cover,
      tone: "highlight",
    };
  } else if (data && settings.joinOpen) {
    strip = {
      key: "lr-strip-join-default",
      message: "Sign-ups are open — join Life Robo.",
      href: "/join",
      label: "Join now",
      image: "",
      tone: "highlight",
    };
  }
  if (!strip || dismissedKey === strip.key || readDismissed(strip.key)) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(strip.key, "1");
    } catch {
      /* ignore */
    }
    setDismissedKey(strip.key);
  };
  const ext = isExternal(strip.href);
  const inner = (
    <span className="flex items-center gap-3 py-2 pr-12 sm:gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/20">
        <img src={strip.image || settings.logoUrl || "/brand/logo-badge.png"} alt="" className="h-full w-full object-cover" width={32} height={32} />
      </span>
      <span className="line-clamp-2 min-w-0 flex-1 text-[13px] font-semibold leading-snug text-white sm:text-[15px]">
        {strip.message} <span className="hidden font-normal text-white/80 underline-offset-2 group-hover:underline sm:inline">{strip.label}.</span>
      </span>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#24086e] transition-transform group-hover:translate-x-0.5">
        {ext ? <ArrowUpRight size={15} /> : <ArrowRight size={15} />}
      </span>
    </span>
  );

  return (
    <div className={cx("relative z-[60] text-white", toneClass[strip.tone])} role="region" aria-label="Announcement">
      <div className="container-x relative">
        {ext ? (
          <a href={strip.href} target="_blank" rel="noopener noreferrer" className="group block">
            {inner}
          </a>
        ) : (
          <Link to={strip.href} className="group block">
            {inner}
          </Link>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white/70 hover:bg-white/15 hover:text-white sm:right-3"
          aria-label="Dismiss announcement"
        >
          <Close size={14} />
        </button>
      </div>
    </div>
  );
}

/* ---------------- Navigation ---------------- */

function Nav() {
  const { settings } = useSite();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const reduce = useReducedMotion();

  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    // Sticky with a negative bottom margin: occupies no layout space, so the hero runs under it.
    <header className="sticky top-0 z-50 -mb-14 md:-mb-16">
      <nav
        aria-label="Main"
        className={cx(
          "transition-[background-color,border-color] duration-300",
          open ? "border-b border-line bg-[#050506]" : scrolled ? "glass border-b border-line" : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="container-x flex h-14 items-center justify-between gap-4 md:h-16">
          <Link to="/" className="flex items-center gap-3 rounded-full" aria-label={`${settings.shortName} — home`}>
            <Badge src={settings.logoUrl} size={32} />
            <Wordmark className="text-[13px] text-fg md:text-[14px]" />
          </Link>
          <ul className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  className={({ isActive }) =>
                    cx("rounded-full px-3.5 py-2 text-[14px] transition-colors", isActive ? "text-fg" : "text-muted hover:text-fg")
                  }
                >
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <Link to="/join" className="btn btn-primary btn-sm hidden sm:inline-flex">
              Join the club
            </Link>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-fg hover:bg-white/10 lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <Close size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto bg-[#050506] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ul className="container-x flex flex-col pt-6">
              {[{ to: "/", label: "Home" }, ...NAV, { to: "/join", label: "Join" }].map((n, i) => (
                <motion.li
                  key={n.to}
                  initial={reduce ? false : { opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * i, duration: 0.3 }}
                  className="border-b border-line"
                >
                  <NavLink
                    to={n.to}
                    end={n.to === "/"}
                    className={({ isActive }) =>
                      cx("block py-4 text-[28px] font-semibold tracking-tight", isActive ? "text-fg" : "text-fg/70 hover:text-fg")
                    }
                  >
                    {n.label}
                  </NavLink>
                </motion.li>
              ))}
            </ul>
            <div className="container-x py-8">
              <Socials socials={settings.socials} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ---------------- Socials ---------------- */

export function Socials({ socials, className }: { socials: SocialLinks; className?: string }) {
  const items = [
    { key: "instagram", href: socials.instagram, label: "Instagram", Icon: Instagram },
    { key: "linkedin", href: socials.linkedin, label: "LinkedIn", Icon: LinkedIn },
    { key: "x", href: socials.x, label: "X (Twitter)", Icon: XLogo },
    { key: "github", href: socials.github, label: "GitHub", Icon: GitHub },
    { key: "youtube", href: socials.youtube, label: "YouTube", Icon: YouTube },
    { key: "email", href: socials.email ? `mailto:${socials.email}` : "", label: "Email", Icon: Mail },
  ].filter((s) => safeHref(s.href));
  if (!items.length) return null;
  return (
    <ul className={cx("flex flex-wrap gap-2", className)}>
      {items.map(({ key, href, label, Icon }) => (
        <li key={key}>
          <SmartLink
            href={href}
            ariaLabel={`Life Robo on ${label}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-muted transition-colors hover:bg-white/[0.12] hover:text-fg"
          >
            <Icon size={18} />
          </SmartLink>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- Footer ---------------- */

function Footer() {
  const { settings } = useSite();
  const year = new Date().getFullYear();
  const important = (settings.importantLinks?.length ? settings.importantLinks : DEFAULT_SETTINGS.importantLinks).filter((l) =>
    safeHref(l.url),
  );
  return (
    <footer className="border-t border-line bg-ink" aria-labelledby="footer-title">
      <div className="container-x grid gap-12 py-16 md:grid-cols-12 md:py-20">
        <div className="md:col-span-5">
          <h2 id="footer-title" className="flex items-center gap-4">
            <Badge src={settings.logoUrl} size={64} />
            <span>
              <Wordmark className="wordmark-gradient block text-[20px]" />
              <span className="mt-1 block text-[13px] text-dim">Robotics Club · FoET, University of Lucknow</span>
            </span>
          </h2>
          <p className="mt-6 max-w-sm text-[15px] text-muted">{settings.mission || settings.heroSubhead}</p>
          <Socials socials={settings.socials} className="mt-6" />
          <address className="mt-6 text-[14px] not-italic leading-relaxed text-dim">
            {settings.address}
            {settings.contactEmail && (
              <>
                <br />
                <a className="link" href={`mailto:${settings.contactEmail}`}>
                  {settings.contactEmail}
                </a>
              </>
            )}
          </address>
        </div>
        <nav className="md:col-span-3 md:col-start-7" aria-label="Quick links">
          <p className="eyebrow mb-4">Quick links</p>
          <ul className="space-y-3 text-[15px]">
            {[{ to: "/", label: "Home" }, ...NAV, { to: "/join", label: "Join the club" }].map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="text-muted hover:text-fg">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {important.length > 0 && (
          <nav className="md:col-span-3" aria-label="Important links">
            <p className="eyebrow mb-4">Important links</p>
            <ul className="space-y-3 text-[15px]">
              {important.map((l) => (
                <li key={l.url}>
                  <SmartLink href={l.url} className="text-muted hover:text-fg">
                    {l.label}
                    <ArrowUpRight size={14} className="ml-1 inline-block align-[-2px]" />
                  </SmartLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-2 py-6 text-[12px] text-dim sm:flex-row sm:justify-between">
          <p>© {year} Life Robo, University of Lucknow</p>
          <p>{settings.tagline}</p>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- Shell ---------------- */

export function SiteLayout() {
  return (
    <>
      <a href="#main" className="sr-only z-[200] rounded-full bg-accent-strong px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <TopStrip />
      <Nav />
      <main id="main" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <Footer />
      <RoboBubble />
      <ScrollRestoration />
    </>
  );
}
