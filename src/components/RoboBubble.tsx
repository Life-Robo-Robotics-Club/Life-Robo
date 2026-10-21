import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { useSite } from "@/lib/site";
import { ArrowRight, Close } from "./icons";

const dayOfYear = () => Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000);

function RobotIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="8" width="16" height="12" rx="4" />
      <path d="M12 4v4M9 14h.01M15 14h.01M9.5 17.5h5M2 13v3M22 13v3" />
      <circle cx="12" cy="3.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function Bulb() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3Z" />
    </svg>
  );
}

/** Floating round robot button → "Daily Robo-Fact" popover (facts from settings.roboFacts). */
export function RoboBubble() {
  const { settings } = useSite();
  const facts = settings.roboFacts.filter(Boolean);
  const [open, setOpen] = useState(false);
  const [day] = useState(dayOfYear);
  const [offset, setOffset] = useState(0);
  const location = useLocation();
  const [lastPath, setLastPath] = useState(location.pathname);
  const btn = useRef<HTMLButtonElement>(null);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);

  const fact = facts.length ? facts[(day + offset) % facts.length] : null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 md:bottom-8 md:right-8">
      <AnimatePresence>
        {open && (
          <motion.div
            id="robo-fact"
            role="dialog"
            aria-labelledby="robo-fact-title"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="glass w-[min(340px,calc(100vw-40px))] origin-bottom-right rounded-[22px] border border-line p-5 shadow-[0_20px_60px_rgb(0_0_0/0.6)]"
          >
            <div className="flex items-start justify-between gap-3">
              <p id="robo-fact-title" className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-warn">
                <Bulb /> Daily Robo-Fact
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-white/10 hover:text-fg"
                aria-label="Close"
              >
                <Close size={16} />
              </button>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={offset}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="mt-3 text-[15px] leading-relaxed text-fg/90"
                aria-live="polite"
              >
                {fact ?? "Robots are built here every week. Come build one with us."}
              </motion.p>
            </AnimatePresence>
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4 text-[14px]">
              {facts.length > 1 ? (
                <button type="button" className="text-muted hover:text-fg" onClick={() => setOffset((o) => o + 1)}>
                  Another fact
                </button>
              ) : (
                <span />
              )}
              <Link to="/join" className="link">
                Join the club <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        ref={btn}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="robo-fact"
        aria-label={open ? "Close Daily Robo-Fact" : "Open Daily Robo-Fact"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-strong text-white shadow-[0_10px_30px_rgb(0_113_227/0.45)] transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <Close size={22} /> : <RobotIcon size={26} />}
      </button>
    </div>
  );
}
