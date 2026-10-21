import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { cx } from "@/lib/format";
import { Badge } from "@/components/Brand";
import { ArrowUpRight, Close, Menu } from "@/components/icons";

const I = ({ d }: { d: ReactNode }) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const SECTIONS: { to: string; label: string; color: string; icon: ReactNode; end?: boolean }[] = [
  { to: "/admin", label: "Dashboard", color: "#636366", end: true, icon: <I d={<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>} /> },
  { to: "/admin/alerts", label: "Alert banner", color: "#ff453a", icon: <I d={<><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" /><path d="M16 8a5 5 0 0 1 0 8" /><path d="M19 5a9 9 0 0 1 0 14" /></>} /> },
  { to: "/admin/content", label: "Site content", color: "#0a84ff", icon: <I d={<><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></>} /> },
  { to: "/admin/events", label: "Events", color: "#ff9f0a", icon: <I d={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>} /> },
  { to: "/admin/projects", label: "Projects", color: "#30d158", icon: <I d={<><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>} /> },
  { to: "/admin/team", label: "Team", color: "#5e5ce6", icon: <I d={<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></>} /> },
  { to: "/admin/gallery", label: "Gallery", color: "#bf5af2", icon: <I d={<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></>} /> },
  { to: "/admin/blog", label: "Blog", color: "#64d2ff", icon: <I d={<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>} /> },
  { to: "/admin/attendance", label: "Attendance", color: "#34c759", icon: <I d={<><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" /></>} /> },
  { to: "/admin/partners", label: "Partners", color: "#ff9500", icon: <I d={<><path d="M8 12h8" /><path d="M9 7H7a5 5 0 0 0 0 10h2" /><path d="M15 7h2a5 5 0 0 1 0 10h-2" /></>} /> },
  { to: "/admin/signups", label: "Signups", color: "#ff375f", icon: <I d={<><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z" /></>} /> },
  { to: "/admin/media", label: "Media library", color: "#ac8e68", icon: <I d={<><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></>} /> },
];

function Sidebar({ onLogout, onNavigate }: { onLogout: () => void; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pb-4 pt-5">
        <Badge size={36} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-tight">Life Robo</p>
          <p className="text-[12px] text-dim">Admin</p>
        </div>
      </div>
      <nav aria-label="Admin sections" className="min-h-0 flex-1 overflow-y-auto px-2.5">
        <ul className="flex flex-col gap-0.5">
          {SECTIONS.map((s) => (
            <li key={s.to}>
              <NavLink
                to={s.to}
                end={s.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cx(
                    "flex min-h-[40px] items-center gap-3 rounded-lg px-2.5 py-1.5 text-[14px] transition-colors",
                    isActive ? "bg-accent-strong text-white" : "text-fg/90 hover:bg-white/[0.06]",
                  )
                }
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white" style={{ background: s.color }}>
                  {s.icon}
                </span>
                {s.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex flex-col gap-1 border-t border-line p-2.5">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[40px] items-center justify-between rounded-lg px-2.5 text-[14px] text-fg/90 hover:bg-white/[0.06]"
        >
          View site <ArrowUpRight size={15} />
        </a>
        <button
          type="button"
          onClick={onLogout}
          className="flex min-h-[40px] items-center rounded-lg px-2.5 text-left text-[14px] text-[#ff6961] hover:bg-danger/10"
        >
          Log out
        </button>
      </div>
    </div>
  );
}

export default function Shell({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);

  // Close the drawer on navigation.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const btn = menuBtn.current;
    drawerRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      btn?.focus();
    };
  }, [open]);

  const current = SECTIONS.slice()
    .reverse()
    .find((s) => (s.end ? location.pathname === s.to || location.pathname === `${s.to}/` : location.pathname.startsWith(s.to)));

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[300] focus:rounded-lg focus:bg-accent-strong focus:px-3 focus:py-2 focus:text-white">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-line bg-ink/90 backdrop-blur-xl lg:block">
        <Sidebar onLogout={onLogout} />
      </aside>

      {/* Mobile top bar */}
      <header className="glass sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-line px-2 lg:hidden">
        <button
          ref={menuBtn}
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/10"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="admin-drawer"
        >
          <Menu size={20} />
        </button>
        <p className="min-w-0 flex-1 truncate text-[16px] font-semibold">{current?.label ?? "Admin"}</p>
        <Badge size={28} className="mr-2" />
      </header>

      {/* Mobile drawer */}
      <div className={cx("fixed inset-0 z-50 lg:hidden", open ? "" : "pointer-events-none")} aria-hidden={!open}>
        <div className={cx("absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
        <div
          id="admin-drawer"
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Admin menu"
          inert={!open}
          className={cx(
            "absolute inset-y-0 left-0 w-[min(300px,86vw)] border-r border-line bg-ink shadow-2xl transition-transform duration-300 ease-[var(--ease-apple)]",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-2 top-4 flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-white/10 hover:text-fg"
            aria-label="Close menu"
          >
            <Close size={18} />
          </button>
          <Sidebar onLogout={onLogout} onNavigate={() => setOpen(false)} />
        </div>
      </div>

      <main id="admin-main" className="lg:pl-[248px]">
        <div className="mx-auto w-full max-w-[1100px] px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
