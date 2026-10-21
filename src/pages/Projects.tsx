import { useMemo } from "react";
import { useSearchParams } from "react-router";
import type { ListResponse, Project } from "@shared/types";
import { useApi } from "@/lib/useApi";
import { usePageMeta } from "@/lib/seo";
import { ProjectCard } from "@/components/Cards";
import { CardSkeletons, EmptyState, ErrorState, PageHero, Reveal, Skeleton } from "@/components/ui";

const ALL = "All";

export default function Projects() {
  usePageMeta("Projects", "Robots, rovers and builds made by Life Robo members at FoET, University of Lucknow.");
  const { data, error, loading, retry } = useApi<ListResponse<Project>>("/api/projects");
  const [params, setParams] = useSearchParams();
  const items = useMemo(() => data?.items ?? [], [data]);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of items) {
      const c = p.category?.trim();
      if (c && !seen.has(c.toLowerCase())) seen.set(c.toLowerCase(), c);
    }
    return [ALL, ...Array.from(seen.values()).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const requested = params.get("category") ?? ALL;
  const active = categories.find((c) => c.toLowerCase() === requested.toLowerCase()) ?? ALL;
  const visible = active === ALL ? items : items.filter((p) => p.category?.trim().toLowerCase() === active.toLowerCase());

  const select = (c: string) => {
    const next = new URLSearchParams(params);
    if (c === ALL) next.delete("category");
    else next.set("category", c);
    setParams(next, { replace: true, preventScrollReset: true });
  };

  return (
    <>
      <PageHero
        eyebrow="Projects"
        title={
          <>
            Ideas, <span className="text-gradient">built.</span>
          </>
        }
        intro="From line followers to autonomous rovers — a look at what our members have designed, wired and coded."
      />
      <section className="container-x pb-24 md:pb-32" aria-labelledby="projects-title">
        <h2 id="projects-title" className="sr-only">
          All projects
        </h2>
        {loading ? (
          <>
            <div className="mb-10 flex gap-2" aria-hidden="true">
              {[64, 96, 88, 72].map((w, i) => (
                <Skeleton key={i} className="h-9 !rounded-full" style={{ width: w }} />
              ))}
            </div>
            <CardSkeletons count={6} />
          </>
        ) : error ? (
          <ErrorState error={error} onRetry={retry} />
        ) : items.length === 0 ? (
          <EmptyState title="Projects are on the workbench" body="Our members are building right now. Check back soon to see what they've made." />
        ) : (
          <>
            {categories.length > 1 && (
              <div role="group" aria-label="Filter projects by category" className="mb-10 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button key={c} type="button" className="chip" aria-pressed={c === active} onClick={() => select(c)}>
                    {c}
                  </button>
                ))}
              </div>
            )}
            <p className="sr-only" aria-live="polite">
              Showing {visible.length} {visible.length === 1 ? "project" : "projects"}
              {active !== ALL ? ` in ${active}` : ""}
            </p>
            {visible.length === 0 ? (
              <EmptyState
                title={`No ${active} projects yet`}
                action={
                  <button type="button" className="btn btn-ghost" onClick={() => select(ALL)}>
                    Show all projects
                  </button>
                }
              />
            ) : (
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((p, i) => (
                  <Reveal as="li" key={p.id} delay={Math.min(i % 3, 2) * 0.06}>
                    <ProjectCard project={p} />
                  </Reveal>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </>
  );
}
