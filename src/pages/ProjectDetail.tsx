import { Link, useParams } from "react-router";
import type { ItemResponse, Project } from "@shared/types";
import { useApi } from "@/lib/useApi";
import { usePageMeta } from "@/lib/seo";
import { safeHref } from "@/lib/format";
import { ArrowUpRight } from "@/components/icons";
import { ErrorState, Img, Reveal, SmartLink } from "@/components/ui";
import NotFound from "./NotFound";
import { BackLink, DetailShell, DetailSkeleton, Markdown, is404 } from "./_shared";

export default function ProjectDetail() {
  const { slug = "" } = useParams();
  const { data, error, loading, retry } = useApi<ItemResponse<Project>>(`/api/projects/${encodeURIComponent(slug)}`);
  const project = data?.item;
  usePageMeta(project?.title ?? "Project", project?.summary);

  if (error && is404(error)) return <NotFound what="project" />;

  const links = (project?.links ?? []).filter((l) => safeHref(l.url));
  const tags = (project?.tags ?? []).filter((t) => t.trim());

  return (
    <DetailShell>
      <BackLink to="/projects" label="All projects" />
      {loading ? (
        <DetailSkeleton aspect="4/3" />
      ) : error || !project ? (
        <div className="mt-8">
          <ErrorState error={error} onRetry={retry} />
        </div>
      ) : (
        <>
          <Reveal className="mt-8 max-w-4xl">
            {project.category && (
              <Link
                to={`/projects?category=${encodeURIComponent(project.category)}`}
                className="eyebrow !text-accent hover:underline"
              >
                {project.category}
              </Link>
            )}
            <h1 className="headline mt-4">{project.title}</h1>
            {project.summary && <p className="mt-6 max-w-2xl text-lg text-muted md:text-xl">{project.summary}</p>}
            {tags.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="Tags">
                {tags.map((t) => (
                  <li key={t} className="rounded-full bg-white/[0.06] px-3 py-1 text-[13px] text-muted">
                    {t}
                  </li>
                ))}
              </ul>
            )}
            {links.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {links.map((l, i) => (
                  <SmartLink key={l.url + i} href={l.url} className={i === 0 ? "btn btn-primary" : "btn btn-ghost"}>
                    {l.label || "Open link"} <ArrowUpRight size={18} />
                  </SmartLink>
                ))}
              </div>
            )}
          </Reveal>
          <Reveal className="mt-12 md:mt-16" delay={0.08}>
            <Img
              src={project.cover}
              alt={project.coverAlt || project.title}
              aspect="16/9"
              priority
              className="rounded-[28px] border border-line"
            />
          </Reveal>
          <Markdown source={project.body} className="prose-lr mx-auto mt-14 max-w-2xl md:mt-20" />
        </>
      )}
    </DetailShell>
  );
}
