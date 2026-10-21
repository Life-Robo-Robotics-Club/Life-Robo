import { useCallback, useEffect, useId, useRef, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Close } from "@/components/icons";

export interface LightboxItem {
  src: string;
  alt: string;
  caption?: string;
}

interface Props {
  items: LightboxItem[];
  /** Index of the open image, or null when closed. */
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/**
 * Accessible image lightbox: modal dialog with focus trap, Esc to close, ←/→ to navigate,
 * swipe on touch, caption + counter, body scroll lock and focus restore on close.
 */
export function Lightbox({ items, index, onClose, onNavigate }: Props) {
  const open = index !== null && index >= 0 && index < items.length;
  const reduce = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const titleId = useId();
  const count = items.length;

  const go = useCallback(
    (delta: number) => {
      if (index === null || count < 2) return;
      onNavigate((index + delta + count) % count);
    },
    [index, count, onNavigate],
  );

  // Scroll lock + focus management (runs once per open/close).
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    const prevPad = html.style.paddingRight;
    const scrollbar = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    if (scrollbar > 0) html.style.paddingRight = `${scrollbar}px`;
    closeRef.current?.focus();
    return () => {
      html.style.overflow = prevOverflow;
      html.style.paddingRight = prevPad;
      previous?.focus?.();
    };
  }, [open]);

  // Keyboard: Esc, arrows, Tab trap.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "Tab" && dialogRef.current) {
        const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (n) => n.getClientRects().length > 0,
        );
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement;
        if (!dialogRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, go, onClose]);

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5) onClose();
  };

  const item = open ? items[index] : null;

  return createPortal(
    <AnimatePresence>
      {open && item && (
        <motion.div
          key="lightbox"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.1 : 0.3, ease: [0.28, 0.11, 0.32, 1] }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <p id={titleId} className="text-[14px] tabular-nums text-muted" aria-live="polite">
              Image {index + 1} of {count}
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-fg transition-colors hover:bg-white/20"
              aria-label="Close image viewer"
            >
              <Close size={20} />
            </button>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-20"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.img
                key={item.src + index}
                src={item.src}
                alt={item.alt}
                className="max-h-full max-w-full select-none rounded-2xl object-contain"
                draggable={false}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0.1 : 0.35, ease: [0.28, 0.11, 0.32, 1] }}
              />
            </AnimatePresence>

            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="glass absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-fg transition-colors hover:bg-white/20 sm:left-6 sm:flex"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="glass absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-fg transition-colors hover:bg-white/20 sm:right-6 sm:flex"
                  aria-label="Next image"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>

          <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <p className="max-w-3xl text-[15px] text-muted">{item.caption || item.alt}</p>
            {count > 1 && (
              <div className="flex shrink-0 gap-2 sm:hidden">
                <button type="button" onClick={() => go(-1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10" aria-label="Previous image">
                  <ChevronLeft size={20} />
                </button>
                <button type="button" onClick={() => go(1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10" aria-label="Next image">
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
