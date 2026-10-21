import { Link } from "react-router";
import type { ClubEvent, ListResponse } from "@shared/types";
import { useApi } from "@/lib/useApi";
import { useSite } from "@/lib/site";
import { usePageMeta } from "@/lib/seo";
import { fmtDate, fmtTime } from "@/lib/format";
import { EventCard } from "@/components/Cards";
import { ArrowRight, Calendar, Clock, Pin } from "@/components/icons";
import { CardSkeletons, EmptyState, ErrorState, Img, PageHero, Reveal, SectionHeader, Skeleton } from "@/components/ui";

function FeaturedEvent({ event }: { event: ClubEvent }) {
  return (
    <Reveal>
      <article className="card grid md:grid-cols-2" aria-labelledby={`fe-${event.id}`}>
        <div className="order-2 flex flex-col justify-center gap-6 p-6 sm:p-10 md:order-1 md:p-12">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-[13px] font-medium text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            Featured event
          </span>
          <h3 id={`fe-${event.id}`} className="title">
            {event.title}
          </h3>
          <ul className="space-y-2 text-[15px] text-muted">
            <li className="flex items-center gap-3">
              <Calendar size={18} className="shrink-0 text-accent" />
              <span>{fmtDate(event.startsAt, { weekday: "long" })}</span>
            </li>
            <li className="flex items-center gap-3">
              <Clock size={18} className="shrink-0 text-accent" />
              <span>
                {fmtTime(event.startsAt)}
                {event.endsAt ? ` – ${fmtTime(event.endsAt)}` : ""}
              </span>
            </li>
            {event.venue && (
              <li className="flex items-center gap-3">
                <Pin size={18} className="shrink-0 text-accent" />
                <span>{event.venue}</span>
              </li>
            )}
          </ul>
          {event.summary && <p className="text-[17px] text-muted">{event.summary}</p>}
          <div>
            <Link to={`/events/${event.slug}`} className="btn btn-primary">
              Details <ArrowRight size={18} />
              <span className="sr-only">: {event.title}</span>
            </Link>
          </div>
        </div>
        <div className="order-1 md:order-2">
          <Img src={event.cover} alt={event.coverAlt || event.title} aspect="4/5" priority className="h-full" />
        </div>
      </article>
    </Reveal>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="card grid md:grid-cols-2" role="status" aria-label="Loading">
      <div className="order-2 space-y-5 p-6 sm:p-10 md:order-1 md:p-12">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-12 w-4/5" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-11 w-32" />
      </div>
      <Skeleton className="order-1 !rounded-none md:order-2" style={{ aspectRatio: "4/5" }} />
    </div>
  );
}

function Upcoming() {
  const { settings } = useSite();
  const { data, error, loading, retry } = useApi<ListResponse<ClubEvent>>("/api/events?status=upcoming");
  const items = data?.items ?? [];
  const featured = items.find((e) => e.featured) ?? items[0];
  const rest = items.filter((e) => e !== featured);

  return (
    <section className="container-x pb-20 md:pb-28" aria-labelledby="upcoming-title">
      <SectionHeader eyebrow="Featured / Upcoming" title="What's next." id="upcoming-title" />
      {loading ? (
        <FeaturedSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : !featured ? (
        <EmptyState
          title="No upcoming events right now"
          body="New workshops and competitions are announced regularly. Follow us so you don't miss the next one."
          instagram={settings.socials?.instagram}
        />
      ) : (
        <>
          <FeaturedEvent event={featured} />
          {rest.length > 0 && (
            <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((e, i) => (
                <Reveal as="li" key={e.id} delay={Math.min(i, 5) * 0.06}>
                  <EventCard event={e} />
                </Reveal>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function Past() {
  const { data, error, loading, retry } = useApi<ListResponse<ClubEvent>>("/api/events?status=past");
  const items = data?.items ?? [];
  return (
    <section className="border-t border-line bg-ink py-20 md:py-28" aria-labelledby="past-title">
      <div className="container-x">
        <SectionHeader eyebrow="Archive" title="Past events." intro="Workshops, competitions and build nights we've run so far." id="past-title" />
        {loading ? (
          <CardSkeletons count={6} aspect="4/5" />
        ) : error ? (
          <ErrorState error={error} onRetry={retry} />
        ) : items.length === 0 ? (
          <EmptyState title="No past events yet" body="Once our first events wrap up, you'll find them here." />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((e, i) => (
              <Reveal as="li" key={e.id} delay={Math.min(i % 3, 2) * 0.06}>
                <EventCard event={e} />
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function Events() {
  usePageMeta("Events", "Workshops, competitions and build nights from Life Robo, the robotics club at FoET, University of Lucknow.");
  return (
    <>
      <PageHero
        eyebrow="Events"
        title={
          <>
            Build. Compete. <span className="text-gradient">Repeat.</span>
          </>
        }
        intro="Hands-on workshops, robotics competitions and build nights — open to every student at FoET."
      />
      <Upcoming />
      <Past />
    </>
  );
}
