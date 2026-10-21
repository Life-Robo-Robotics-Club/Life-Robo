import { useParams } from "react-router";
import type { ClubEvent, ItemResponse } from "@shared/types";
import { useApi } from "@/lib/useApi";
import { usePageMeta } from "@/lib/seo";
import { fmtDate, fmtTime, safeHref } from "@/lib/format";
import { ArrowUpRight, Calendar, Clock, Pin } from "@/components/icons";
import { ErrorState, Img, Reveal, SmartLink } from "@/components/ui";
import NotFound from "./NotFound";
import { BackLink, DetailShell, DetailSkeleton, ImageGrid, Markdown, is404 } from "./_shared";
import { RegisterForm } from "./_RegisterForm";

export default function EventDetail() {
  const { slug = "" } = useParams();
  const { data, error, loading, retry } = useApi<ItemResponse<ClubEvent>>(`/api/events/${encodeURIComponent(slug)}`);
  const event = data?.item;
  usePageMeta(event?.title ?? "Event", event?.summary);

  if (error && is404(error)) return <NotFound what="event" />;

  return (
    <DetailShell>
      <BackLink to="/events" label="All events" />
      {loading ? (
        <DetailSkeleton />
      ) : error || !event ? (
        <div className="mt-8">
          <ErrorState error={error} onRetry={retry} />
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-10 md:grid-cols-12 md:gap-14">
            <Reveal className="md:col-span-5">
              <Img src={event.cover} alt={event.coverAlt || event.title} aspect="4/5" priority className="rounded-[28px] border border-line" />
            </Reveal>
            <Reveal className="md:col-span-7" delay={0.08}>
              <p className="eyebrow mb-4">{event.status === "upcoming" ? "Upcoming event" : "Past event"}</p>
              <h1 className="headline">{event.title}</h1>
              <ul className="mt-8 space-y-3 text-[17px] text-muted">
                <li className="flex items-center gap-3">
                  <Calendar size={20} className="shrink-0 text-accent" />
                  <span>
                    {fmtDate(event.startsAt, { weekday: "long" })}
                    {event.endsAt && fmtDate(event.endsAt) !== fmtDate(event.startsAt) ? ` – ${fmtDate(event.endsAt)}` : ""}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Clock size={20} className="shrink-0 text-accent" />
                  <span>
                    {fmtTime(event.startsAt)}
                    {event.endsAt ? ` – ${fmtTime(event.endsAt)}` : ""} IST
                  </span>
                </li>
                {event.venue && (
                  <li className="flex items-center gap-3">
                    <Pin size={20} className="shrink-0 text-accent" />
                    <span>{event.venue}</span>
                  </li>
                )}
              </ul>
              {event.summary && <p className="mt-8 text-lg text-fg/90 md:text-xl">{event.summary}</p>}
              {event.registrationOpen && event.status === "upcoming" ? (
                <div className="mt-8" id="register">
                  <RegisterForm event={event} />
                </div>
              ) : safeHref(event.registerUrl) && (
                <div className="mt-8">
                  <SmartLink href={event.registerUrl} className="btn btn-primary">
                    Register now <ArrowUpRight size={18} />
                  </SmartLink>
                </div>
              )}
              <Markdown source={event.body} className="prose-lr mt-10 max-w-2xl" />
            </Reveal>
          </div>

          {event.images?.some(Boolean) && (
            <section className="mt-20 md:mt-28" aria-labelledby="event-photos">
              <h2 id="event-photos" className="title mb-8">
                Photos
              </h2>
              <ImageGrid images={event.images} title={event.title} />
            </section>
          )}
        </>
      )}
    </DetailShell>
  );
}
