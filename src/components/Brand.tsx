import { useState } from "react";
import { cx } from "@/lib/format";

/** Circular club badge. Source is admin-replaceable via settings.logoUrl. */
export function Badge({ src, size = 36, className }: { src?: string; size?: number; className?: string }) {
  const [err, setErr] = useState(false);
  const url = !err && src ? src : "/brand/logo-badge.png";
  return (
    <img
      src={url}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      decoding="async"
      onError={() => setErr(true)}
      className={cx("shrink-0 rounded-full object-cover ring-1 ring-white/10", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Typographic wordmark — wide-tracked, as on the club's posters. */
export function Wordmark({ className }: { className?: string }) {
  return <span className={cx("wordmark", className)}>Life&nbsp;Robo</span>;
}
