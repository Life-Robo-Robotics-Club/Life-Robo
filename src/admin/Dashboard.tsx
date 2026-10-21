import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Alert, ClubEvent, GalleryImage, Signup, TeamMember } from "@shared/types";
import { fmtDate } from "@/lib/format";
import { ArrowRight, Plus } from "@/components/icons";
import { useAdminData } from "./hooks";
import { AlertStrip } from "./AlertPreview";
import { PageHeader } from "./ui";
import { countSince, pickLiveAlert } from "./utils";

type L<T> = { items: T[] };

function Stat({ label, value, sub, to, loading }: { label: string; value: ReactNode; sub?: ReactNode; to: string; loading: boolean }) {
  return (
    <Link to={to} className="group flex flex-col rounded-2xl border border-line bg-elev p-4 transition-colors hover:border-line-strong sm:p-5">
      <span className="text-[13px] font-medium text-muted">{label}</span>
      {loading ? (
        <span className="skeleton mt-2 h-9 w-16 !rounded-md" aria-label="Loading" />
      ) : (
        <span className="mt-1 text-[34px] font-semibold leading-tight tracking-[-0.02em] tabular-nums">{value}</span>
      )}
      <span className="mt-1 min-h-[1.25rem] text-[13px] text-dim">{loading ? "" : sub}</span>
    </Link>
  );
}

export default function Dashboard() {
  const events = useAdminData<L<ClubEvent>>("/api/admin/events");
  const signups = useAdminData<L<Signup>>("/api/admin/signups");
  const team = useAdminData<L<TeamMember>>("/api/admin/team");
  const gallery = useAdminData<L<GalleryImage>>("/api/admin/gallery");
  const alerts = useAdminData<L<Alert>>("/api/admin/alerts");

  const ev = events.data?.items ?? [];
  const upcoming = ev.filter((e) => e.status === "upcoming");
  const nextEvent = upcoming.slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const su = signups.data?.items ?? [];

  const recent = countSince(su, 7);
  const tm = team.data?.items ?? [];
  const gl = gallery.data?.items ?? [];
  const live = alerts.data ? pickLiveAlert(alerts.data.items) : null;
  const failed = [events, signups, team, gallery].some((d) => d.error && !d.data);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back. Here's what's on the Life Robo site."
        actions={
          <>
            <Link to="/admin/events/new" className="btn btn-primary btn-sm">
              <Plus size={16} /> New event
            </Link>
            <Link to="/admin/alerts" className="btn btn-ghost btn-sm">
              Edit alert banner
            </Link>
          </>
        }
      />
      {failed && (
        <p role="alert" className="mb-4 rounded-xl bg-danger/10 px-4 py-3 text-[14px] text-[#ff6961]">
          Some numbers couldn't be loaded. Refresh to try again.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat
          label="Upcoming events"
          value={upcoming.length}
          sub={`${ev.length - upcoming.length} past`}
          to="/admin/events"
          loading={events.loading && !events.data}
        />
        <Stat label="Signups" value={su.length} sub={`${recent} in the last 7 days`} to="/admin/signups" loading={signups.loading && !signups.data} />
        <Stat
          label="Team"
          value={tm.length}
          sub={`${tm.filter((t) => t.active).length} shown on site`}
          to="/admin/team"
          loading={team.loading && !team.data}
        />
        <Stat
          label="Gallery"
          value={gl.length}
          sub={`${gl.filter((g) => g.featured).length} featured`}
          to="/admin/gallery"
          loading={gallery.loading && !gallery.data}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-elev p-4 sm:p-5" aria-labelledby="dash-alert">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 id="dash-alert" className="text-[15px] font-semibold">
              Alert banner
            </h2>
            <Link to="/admin/alerts" className="inline-flex items-center gap-1 text-[14px] text-accent hover:underline">
              Manage <ArrowRight size={14} />
            </Link>
          </div>
          {alerts.loading && !alerts.data ? (
            <div className="skeleton h-12 w-full" />
          ) : live ? (
            <AlertStrip message={live.message} linkLabel={live.linkLabel} linkUrl={live.linkUrl} image={live.image} tone={live.tone} />
          ) : (
            <p className="text-[14px] text-muted">No alert is live — the site shows the default “Join” strip while sign-ups are open.</p>
          )}
        </section>
        <section className="rounded-2xl border border-line bg-elev p-4 sm:p-5" aria-labelledby="dash-next">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 id="dash-next" className="text-[15px] font-semibold">
              Next event
            </h2>
            <Link to="/admin/events" className="inline-flex items-center gap-1 text-[14px] text-accent hover:underline">
              All events <ArrowRight size={14} />
            </Link>
          </div>
          {events.loading && !events.data ? (
            <div className="skeleton h-12 w-full" />
          ) : nextEvent ? (
            <Link to={`/admin/events/${nextEvent.id}`} className="block rounded-xl p-2 -m-2 hover:bg-white/[0.04]">
              <p className="text-[16px] font-medium">{nextEvent.title}</p>
              <p className="text-[14px] text-muted">
                {fmtDate(nextEvent.startsAt, { weekday: "short" })}
                {nextEvent.venue ? ` · ${nextEvent.venue}` : ""}
                {!nextEvent.published ? " · Draft" : ""}
              </p>
            </Link>
          ) : (
            <p className="text-[14px] text-muted">
              Nothing scheduled.{" "}
              <Link to="/admin/events/new" className="text-accent hover:underline">
                Create an event
              </Link>
            </p>
          )}
        </section>
      </div>

      <section className="mt-8" aria-labelledby="dash-quick">
        <h2 id="dash-quick" className="mb-2 px-1 text-[15px] font-semibold">
          Quick actions
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { to: "/admin/events/new", label: "New event" },
            { to: "/admin/alerts", label: "Edit alert banner" },
            { to: "/admin/gallery", label: "Upload gallery photos" },
            { to: "/admin/blog/new", label: "Write a blog post" },
            { to: "/admin/content", label: "Edit home page content" },
            { to: "/admin/signups", label: "Export signups" },
          ].map((a) => (
            <Link
              key={a.to + a.label}
              to={a.to}
              className="flex min-h-[48px] items-center justify-between rounded-xl border border-line bg-elev px-4 text-[15px] hover:border-line-strong"
            >
              {a.label} <ArrowRight size={16} className="text-dim" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
