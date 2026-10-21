import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { preloadSite } from "@/lib/site";

const KEY = "lr-intro-seen";
const HARD_CAP_MS = 5500;
const MIN_MS = 3400; // full type-on + logo reveal + bar sweep, even when everything is cached
const TAGLINE = "INNOVATE. BUILD. COMPETE.";
const TYPE_START_MS = 350;
const TYPE_STEP_MS = 75;
const TRAIL = 4;
// Dev aid: /?introhold keeps the loader on screen for design review.
const HOLD = import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("introhold"); // trailing characters that are still "cooling" from dim to cyan

// eslint-disable-next-line react-refresh/only-export-components
export function shouldShowIntro() {
  if (typeof window === "undefined") return false;
  if (window.location.pathname.startsWith("/admin")) return false;
  if (window.location.pathname.startsWith("/certificates/")) return false; // straight to the certificate from the email link
  if (HOLD) return true;
  try {
    return sessionStorage.getItem(KEY) !== "1";
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* private mode — fine */
  }
  document.documentElement.classList.add("intro-seen");
}

function loadImage(src: string) {
  return new Promise<void>((resolve) => {
    if (!src) return resolve();
    const img = new Image();
    img.decoding = "async";
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

/**
 * First-visit intro (after the ERC reference, Apple-polished):
 *  1. aurora bands drift over deep navy, with a soft spotlight beam from the top-right;
 *  2. a cyan, wide-tracked tagline types itself out — freshest letters still dim;
 *  3. the badge + gradient LIFE ROBO wordmark resolves in above it;
 *  4. a hairline cyan bar on the bottom edge tracks real loading (site JSON, fonts, hero image);
 *  5. the loader lifts away like a curtain into the hero.
 */
export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const [target, setTarget] = useState(5);
  const [shown, setShown] = useState(0);
  const [typed, setTyped] = useState(0);
  const [exiting, setExiting] = useState(false);
  const shownRef = useRef(0);
  const finished = useRef(false);

  // Real work → target progress.
  useEffect(() => {
    let alive = true;
    const bump = (n: number) => alive && setTarget((t) => Math.min(100, t + n));
    const site = preloadSite()
      .then((d) => {
        bump(40);
        return loadImage(d.settings.heroImage).then(() => bump(35));
      })
      .catch(() => bump(75));
    const fonts = (document.fonts?.ready ?? Promise.resolve()).then(() => bump(20));
    const minWait = new Promise((r) => setTimeout(r, reduce ? 400 : MIN_MS));
    const cap = new Promise((r) => setTimeout(r, HARD_CAP_MS - 350));
    Promise.race([Promise.all([site, fonts, minWait]), cap]).then(() => {
      if (!alive) return;
      setTarget(100);
      if (!HOLD) setTimeout(() => alive && setExiting(true), 650); // let the bar visibly reach the end and settle
    });
    return () => {
      alive = false;
    };
  }, [reduce]);

  // Type-on tagline.
  useEffect(() => {
    if (reduce) {
      const t = setTimeout(() => setTyped(TAGLINE.length + TRAIL), 0);
      return () => clearTimeout(t);
    }
    // Clock-driven so typing never lags the progress bar on a busy main thread.
    const t0 = performance.now();
    const total = TAGLINE.length + TRAIL;
    const iv = window.setInterval(() => {
      const n = Math.max(0, Math.min(total, Math.floor((performance.now() - t0 - TYPE_START_MS) / TYPE_STEP_MS)));
      setTyped(n);
      if (n >= total) clearInterval(iv);
    }, 16);
    return () => clearInterval(iv);
  }, [reduce]);

  // Displayed progress follows real loading but is paced by the clock (ease-out over MIN_MS),
  // so a fast, cached load still shows a smooth sweep instead of jumping to 100.
  const startRef = useRef(0);
  useEffect(() => {
    if (!startRef.current) startRef.current = performance.now();
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (performance.now() - startRef.current) / (reduce ? 400 : MIN_MS));
      const clock = (1 - Math.pow(1 - t, 2.2)) * 100;
      const goal = Math.min(target, clock);
      const cur = shownRef.current;
      const next = cur + (goal - cur) * 0.12;
      shownRef.current = Math.abs(goal - next) < 0.3 ? goal : next;
      setShown(shownRef.current);
      if (shownRef.current < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce]);

  // Esc skips; lock scroll while visible; drop the pre-paint boot layer.
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setExiting(true);
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.getElementById("boot")?.remove();
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, []);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    markSeen();
    onDone();
  };

  const pct = Math.round(shown);
  const curtain = [0.76, 0, 0.24, 1] as const;
  const soft = [0.16, 1, 0.3, 1] as const;
  const logoIn = typed >= Math.floor(TAGLINE.length * 0.55) || reduce;

  return (
    <AnimatePresence onExitComplete={finish}>
      {!exiting && (
        <motion.div
          key="intro"
          role="status"
          aria-live="polite"
          aria-busy={pct < 100}
          aria-label={`Loading Life Robo — ${pct}%`}
          className="fixed inset-0 z-[100] select-none overflow-hidden bg-[#05070d]"
          style={{ clipPath: "inset(0 0 0% 0)" }}
          exit={
            reduce
              ? { opacity: 0, transition: { duration: 0.35 } }
              : { clipPath: "inset(0 0 100% 0)", transition: { duration: 0.85, ease: curtain, delay: 0.1 } }
          }
        >
          {/* Animated aurora + spotlight beam */}
          <div className="aurora" aria-hidden="true">
            <div className="aurora__band aurora__band--a" />
            <div className="aurora__band aurora__band--b" />
            <div className="aurora__beam" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(5_7_13/0.8)_100%)]" />
          </div>

          <motion.div
            className="relative mx-auto flex h-full w-full max-w-[1200px] flex-col justify-center px-6 sm:px-10 lg:px-16"
            exit={reduce ? undefined : { opacity: 0, y: -40, transition: { duration: 0.45, ease: curtain } }}
          >
            {/* Step 2: badge + gradient wordmark (appears above the tagline) */}
            <motion.div
              className="flex items-center gap-4 sm:gap-6"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 12, filter: "blur(10px)" }}
              animate={logoIn ? (reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }) : undefined}
              transition={{ duration: 0.9, ease: soft }}
              style={{ transformOrigin: "left center" }}
            >
              <img
                src="/brand/logo-badge.png"
                alt=""
                width={176}
                height={176}
                className="h-28 w-28 rounded-full shadow-[0_0_60px_rgb(59_130_246/0.4)] sm:h-36 sm:w-36 lg:h-44 lg:w-44"
              />
              <p
                className="wordmark-gradient font-semibold leading-none"
                style={{ fontSize: "clamp(2.75rem, 10vw, 7.5rem)", letterSpacing: "0.04em" }}
                aria-hidden="true"
              >
                LIFE ROBO
              </p>
            </motion.div>

            {/* Step 1: type-on tagline */}
            <p
              className="mt-6 font-mono text-[13px] font-medium uppercase sm:mt-8 sm:text-[16px] lg:text-[18px]"
              style={{ letterSpacing: "0.3em" }}
              aria-label="Innovate. Build. Compete."
            >
              {TAGLINE.split("").map((ch, j) => {
                if (j >= typed) return null;
                const d = typed - 1 - j; // 0 = newest character
                const cooling = d < TRAIL && typed <= TAGLINE.length + TRAIL - 1;
                const opacity = cooling ? 0.35 + (d / TRAIL) * 0.65 : 1;
                return (
                  <span
                    key={j}
                    aria-hidden="true"
                    style={{
                      color: cooling ? "#64748b" : "#22d3ee",
                      opacity,
                      textShadow: cooling ? "none" : "0 0 14px rgb(34 211 238 / 0.55), 0 0 2px rgb(34 211 238 / 0.9)",
                      transition: "color 220ms ease, opacity 220ms ease, text-shadow 300ms ease",
                    }}
                  >
                    {ch === " " ? " " : ch}
                  </span>
                );
              })}
              <span
                aria-hidden="true"
                className="ml-1 inline-block h-[1em] w-[2px] translate-y-[2px] bg-[#22d3ee]"
                style={{ animation: "caret-blink 1s steps(1) infinite", boxShadow: "0 0 10px #22d3ee" }}
              />
            </p>
            <motion.p
              className="mt-4 text-[12px] uppercase tracking-[0.24em] text-slate-500"
              initial={{ opacity: 0 }}
              animate={logoIn ? { opacity: 1 } : undefined}
              transition={{ delay: 0.35, duration: 0.6 }}
            >
              Robotics Club · FoET, University of Lucknow
            </motion.p>
          </motion.div>

          {/* Step 3: progress along the very bottom edge */}
          <div className="absolute inset-x-0 bottom-0" aria-hidden="true">
            <div className="flex justify-end px-5 pb-3 font-mono text-[11px] tabular-nums tracking-[0.2em] text-slate-500 sm:px-8">
              {String(pct).padStart(3, "0")}%
            </div>
            <div className="h-[2px] w-full bg-white/5">
              <div
                className="h-full origin-left bg-[#22d3ee]"
                style={{ transform: `scaleX(${shown / 100})`, boxShadow: "0 0 12px #22d3ee, 0 0 2px #22d3ee" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
