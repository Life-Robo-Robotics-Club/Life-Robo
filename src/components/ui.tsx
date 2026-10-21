import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { cx, isExternal, safeHref } from "@/lib/format";
import { Instagram, Refresh } from "./icons";

/* ---------- Image with lazy loading, reserved aspect ratio and graceful fallback ---------- */

interface ImgProps {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  aspect?: string; // e.g. "16/9"
  priority?: boolean;
  sizes?: string;
  style?: CSSProperties;
  fit?: "cover" | "contain";
}

export function Img({ src, alt, className, imgClassName, aspect, priority, sizes, style, fit = "cover" }: ImgProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const failed = !src || failedSrc === src;
  const loaded = loadedSrc === src;
  return (
    <div
      className={cx("relative overflow-hidden bg-elev", className)}
      style={{ aspectRatio: aspect, ...style }}
    >
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-elev to-elev-2" role="img" aria-label={alt}>
          <span className="wordmark text-[11px] text-dim">Life Robo</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
          sizes={sizes}
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailedSrc(src)}
          className={cx(
            "absolute inset-0 h-full w-full transition-[opacity,transform] duration-700 ease-[var(--ease-apple)]",
            fit === "cover" ? "object-cover" : "object-contain",
            loaded ? "opacity-100" : "opacity-0",
            imgClassName,
          )}
        />
      )}
    </div>
  );
}

/* ---------- Scroll reveal ---------- */

export function Reveal({
  children,
  delay = 0,
  className,
  y = 28,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
  as?: "div" | "li" | "section" | "article";
}) {
  const reduce = useReducedMotion();
  const M = motion[as];
  return (
    <M
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: reduce ? 0.2 : 0.8, delay, ease: [0.28, 0.11, 0.32, 1] }}
    >
      {children}
    </M>
  );
}

/* ---------- Links & buttons that only ever point somewhere real ---------- */

export function SmartLink({
  href,
  children,
  className,
  ariaLabel,
}: {
  href: string | null | undefined;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const h = safeHref(href);
  if (!h) return null;
  if (isExternal(h)) {
    const web = /^https?:/i.test(h);
    return (
      <a href={h} className={className} aria-label={ariaLabel} {...(web ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    );
  }
  return (
    <Link to={h} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

/* ---------- Section header ---------- */

export function SectionHeader({
  eyebrow,
  title,
  intro,
  action,
  light,
  id,
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  action?: ReactNode;
  light?: boolean;
  id?: string;
}) {
  return (
    <Reveal className="mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <p className={cx("eyebrow mb-3", light && "!text-ink-muted")}>{eyebrow}</p>}
        <h2 id={id} className={cx("headline", light ? "text-ink-fg" : "text-fg")}>{title}</h2>
        {intro && <p className={cx("mt-5 max-w-2xl text-lg md:text-xl", light ? "text-ink-muted" : "text-muted")}>{intro}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Reveal>
  );
}

/* ---------- States ---------- */

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cx("skeleton", className)} style={style} aria-hidden="true" />;
}

export function CardSkeletons({ count = 3, aspect = "4/3" }: { count?: number; aspect?: string }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card p-0">
          <Skeleton className="!rounded-none" style={{ aspectRatio: aspect }} />
          <div className="space-y-3 p-6">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  instagram,
  action,
}: {
  title: string;
  body?: ReactNode;
  instagram?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-4 px-6 py-14 text-center">
      <p className="title text-fg">{title}</p>
      {body && <p className="max-w-md text-muted">{body}</p>}
      <div className="flex flex-wrap justify-center gap-3">
        {instagram && (
          <SmartLink href={instagram} className="btn btn-ghost">
            <Instagram size={18} /> Follow on Instagram
          </SmartLink>
        )}
        {action}
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry, compact }: { error?: Error; onRetry?: () => void; compact?: boolean }) {
  return (
    <div role="alert" className={cx("card flex flex-col items-center gap-4 text-center", compact ? "px-6 py-8" : "px-6 py-14")}>
      <p className="title text-fg">Something went wrong</p>
      <p className="max-w-md text-muted">{error?.message || "We couldn't load this right now."}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-ghost">
          <Refresh size={18} /> Try again
        </button>
      )}
    </div>
  );
}

/* ---------- Page hero (inner pages) ---------- */

export function PageHero({ eyebrow, title, intro, children }: { eyebrow?: string; title: ReactNode; intro?: ReactNode; children?: ReactNode }) {
  return (
    <header className="relative overflow-hidden pb-14 pt-36 md:pb-20 md:pt-44">
      <div className="tech-grid mask-fade-b pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[900px] -translate-x-1/2 rounded-full opacity-40 blur-[120px]"
        style={{ background: "radial-gradient(closest-side, rgb(41 151 255 / 0.45), rgb(139 92 246 / 0.15), transparent)" }}
        aria-hidden="true"
      />
      <div className="container-x relative">
        <Reveal>
          {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
          <h1 className="display max-w-5xl">{title}</h1>
          {intro && <p className="mt-6 max-w-2xl text-lg text-muted md:text-xl">{intro}</p>}
          {children}
        </Reveal>
      </div>
    </header>
  );
}
