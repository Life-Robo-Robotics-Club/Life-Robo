import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useSite } from "@/lib/site";
import { useIntroDone } from "@/lib/intro";
import { SmartLink } from "@/components/ui";
import { ArrowRight, ChevronDown } from "@/components/icons";

const ease = [0.16, 1, 0.3, 1] as const;

function Bolt() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  );
}

/**
 * Full-bleed hero: pill badge → huge gradient wordmark → headline → subhead → two pill CTAs.
 * Background: parallax club photo under a dark scrim, drifting glow, slow-panning tech grid.
 */
export function Hero() {
  const { settings } = useSite();
  const ready = useIntroDone();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "20%"]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.06, reduce ? 1.06 : 1.16]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-14%"]);
  const fade = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  const anim = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: ready ? { opacity: 1 } : undefined, transition: { duration: 0.4, delay } }
      : {
          initial: { opacity: 0, y: 26, filter: "blur(10px)" },
          animate: ready ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined,
          transition: { duration: 1.1, delay, ease },
        };

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden pb-20 pt-28"
      aria-labelledby="hero-title"
    >
      {/* Media with parallax */}
      <motion.div className="absolute inset-0" style={{ y: imgY, scale: imgScale }} aria-hidden="true">
        {settings.heroImage && (
          <img src={settings.heroImage} alt="" className="h-full w-full object-cover opacity-40" fetchPriority="high" decoding="async" />
        )}
      </motion.div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.7)_0%,rgb(0_0_0/0.45)_45%,#000_100%)]" aria-hidden="true" />
      <div
        className="tech-grid absolute inset-0 animate-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,#000_15%,transparent_70%)]"
        aria-hidden="true"
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-48 -top-24 h-[680px] w-[680px] rounded-full blur-[130px]"
        style={{ background: "radial-gradient(closest-side, rgb(41 151 255 / 0.4), rgb(139 92 246 / 0.16), transparent)" }}
        animate={reduce ? undefined : { x: [0, -50, 0], y: [0, 40, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div className="container-x relative flex flex-col items-center text-center" style={{ y: contentY, opacity: fade }}>
        {settings.heroEyebrow && (
          <motion.p
            className="glass inline-flex max-w-full items-center gap-2 rounded-2xl border border-line-strong px-4 py-1.5 text-left text-[13px] font-medium text-fg/85 sm:rounded-full"
            {...anim(0.05)}
          >
            <span className="text-warn"><Bolt /></span>
            <span>{settings.heroEyebrow}</span>
          </motion.p>
        )}

        <h1 id="hero-title" className="mt-7">
          <motion.span
            className="wordmark-gradient block font-semibold leading-[0.9]"
            style={{ fontSize: "clamp(3.5rem, 15vw, 12.5rem)", letterSpacing: "0.02em" }}
            {...anim(0.15)}
          >
            {settings.shortName.toUpperCase()}
          </motion.span>
          <motion.span
            className="mx-auto mt-5 block max-w-4xl text-balance text-[clamp(1.75rem,4.2vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-fg"
            {...anim(0.3)}
          >
            {settings.heroHeadline}
          </motion.span>
        </h1>

        <motion.p className="mx-auto mt-6 max-w-2xl text-lg text-fg/70 md:text-[21px] md:leading-snug" {...anim(0.42)}>
          {settings.heroSubhead}
        </motion.p>

        <motion.div className="mt-10 flex flex-wrap justify-center gap-3" {...anim(0.54)}>
          <SmartLink href={settings.heroPrimaryCta.href} className="btn btn-primary">
            {settings.heroPrimaryCta.label}
            <ArrowRight size={18} />
          </SmartLink>
          <SmartLink href={settings.heroSecondaryCta.href} className="btn btn-ghost border border-line-strong">
            {settings.heroSecondaryCta.label}
          </SmartLink>
        </motion.div>
      </motion.div>

      <motion.a
        href="#about"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-[12px] uppercase tracking-[0.2em] text-dim hover:text-fg md:flex"
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : undefined}
        transition={{ delay: 1.4 }}
      >
        Scroll <ChevronDown size={14} />
      </motion.a>
    </section>
  );
}
