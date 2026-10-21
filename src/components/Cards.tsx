import { Link } from "react-router";
import type { ClubEvent, Post, Project } from "@shared/types";
import { dateParts, fmtDate, fmtTime } from "@/lib/format";
import { ArrowRight, Calendar, Pin } from "./icons";
import { Img } from "./ui";

export function EventCard({ event, priority }: { event: ClubEvent; priority?: boolean }) {
  const d = dateParts(event.startsAt);
  return (
    <Link to={`/events/${event.slug}`} className="card group flex h-full flex-col transition-colors hover:border-line-strong">
      <div className="relative">
        <Img
          src={event.cover}
          alt={event.coverAlt || event.title}
          aspect="4/5"
          priority={priority}
          imgClassName="group-hover:scale-[1.04]"
        />
        <div className="glass absolute left-4 top-4 flex flex-col items-center rounded-2xl px-3 py-2 text-center leading-none">
          <span className="text-[22px] font-semibold">{d.day}</span>
          <span className="mt-1 text-[11px] tracking-[0.12em] text-muted">{d.month} {d.year}</span>
        </div>
        {event.status === "upcoming" && (
          <span className="absolute right-4 top-4 rounded-full bg-accent-strong px-3 py-1 text-[12px] font-medium text-white">Upcoming</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-[21px] font-semibold leading-tight tracking-tight">{event.title}</h3>
        <p className="mt-2 line-clamp-3 text-[15px] text-muted">{event.summary}</p>
        <div className="mt-auto space-y-1 pt-5 text-[13px] text-dim">
          {event.venue && (
            <p className="flex items-center gap-2"><Pin size={14} /> {event.venue}</p>
          )}
          <p className="flex items-center gap-2"><Calendar size={14} /> {fmtDate(event.startsAt)} · {fmtTime(event.startsAt)}</p>
        </div>
      </div>
    </Link>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link to={`/projects/${project.slug}`} className="card group flex h-full flex-col transition-colors hover:border-line-strong">
      <Img src={project.cover} alt={project.coverAlt || project.title} aspect="4/3" imgClassName="group-hover:scale-[1.04]" />
      <div className="flex flex-1 flex-col p-6">
        {project.category && <p className="eyebrow !text-accent">{project.category}</p>}
        <h3 className="mt-2 text-[21px] font-semibold leading-tight tracking-tight">{project.title}</h3>
        <p className="mt-2 line-clamp-3 text-[15px] text-muted">{project.summary}</p>
        <span className="link mt-auto pt-5 text-[15px]">
          View project <ArrowRight size={16} />
        </span>
      </div>
    </Link>
  );
}

export function PostCard({ post }: { post: Post }) {
  return (
    <Link to={`/blog/${post.slug}`} className="card group flex h-full flex-col transition-colors hover:border-line-strong">
      <Img src={post.cover} alt={post.coverAlt || post.title} aspect="16/10" imgClassName="group-hover:scale-[1.04]" />
      <div className="flex flex-1 flex-col p-6">
        <p className="text-[13px] text-dim">{fmtDate(post.publishedAt)}{post.author ? ` · ${post.author}` : ""}</p>
        <h3 className="mt-2 text-[21px] font-semibold leading-tight tracking-tight">{post.title}</h3>
        <p className="mt-2 line-clamp-3 text-[15px] text-muted">{post.excerpt}</p>
        <span className="link mt-auto pt-5 text-[15px]">
          Read more <ArrowRight size={16} />
        </span>
      </div>
    </Link>
  );
}
