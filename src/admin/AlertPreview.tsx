import { Link } from "react-router";
import type { Alert, AlertTone } from "@shared/types";
import { pickLiveAlert } from "./utils";

/** Top of the alerts list: what visitors see right now. */
export function AlertsLiveNow({ items }: { items: Alert[] }) {
  const live = pickLiveAlert(items);
  return (
    <section aria-labelledby="alerts-live" className="mb-8 rounded-2xl border border-line bg-elev p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="alerts-live" className="text-[15px] font-semibold">
          On the site right now
        </h2>
        {live && (
          <Link to={`/admin/alerts/${live.id}`} className="text-[14px] text-accent hover:underline">
            Edit this alert
          </Link>
        )}
      </div>
      {live ? (
        <AlertStrip message={live.message} linkLabel={live.linkLabel} linkUrl={live.linkUrl} image={live.image} tone={live.tone} />
      ) : (
        <>
          <AlertStrip message="Sign-ups are open — join Life Robo." linkLabel="Join now" linkUrl="/join" image="" tone="highlight" />
          <p className="mt-2 text-[13px] text-dim">
            No alert is live, so visitors see the default join strip (only while sign-ups are open in Site content → Join).
          </p>
        </>
      )}
      <p className="mt-2 text-[13px] text-dim">Changes reach the site within ~30 seconds.</p>
    </section>
  );
}
import { cx, isExternal } from "@/lib/format";
import { ArrowRight, ArrowUpRight, Close } from "@/components/icons";

const toneClass: Record<AlertTone, string> = {
  highlight: "bg-[linear-gradient(90deg,#24086e_0%,#3a0ca3_55%,#1e3a8a_100%)]",
  urgent: "bg-[linear-gradient(90deg,#7f1d1d_0%,#b42318_60%,#c2410c_100%)]",
  info: "bg-elev-2",
};

/** Visual replica of the site's top strip (src/components/Layout.tsx → TopStrip). Not interactive. */
export function AlertStrip({
  message,
  linkLabel,
  linkUrl,
  image,
  tone,
  logoUrl,
}: {
  message: string;
  linkLabel: string;
  linkUrl: string;
  image: string;
  tone: AlertTone;
  logoUrl?: string;
}) {
  const ext = isExternal(linkUrl || "/events");
  return (
    <div className={cx("relative overflow-hidden rounded-xl text-white ring-1 ring-white/10", toneClass[tone])} aria-hidden="true">
      <div className="relative px-3 sm:px-4">
        <span className="flex items-center gap-3 py-2 pr-10 sm:gap-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/20">
            <img src={image || logoUrl || "/brand/logo-badge.png"} alt="" className="h-full w-full object-cover" width={32} height={32} />
          </span>
          <span className="line-clamp-2 min-w-0 flex-1 text-[13px] font-semibold leading-snug text-white sm:text-[15px]">
            {message || <span className="text-white/50">Your message appears here</span>}{" "}
            <span className="hidden font-normal text-white/80 sm:inline">{linkLabel || "Learn more"}.</span>
          </span>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#24086e]">
            {ext ? <ArrowUpRight size={15} /> : <ArrowRight size={15} />}
          </span>
        </span>
        <span className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white/70">
          <Close size={14} />
        </span>
      </div>
    </div>
  );
}
