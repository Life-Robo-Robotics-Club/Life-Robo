import type { ListResponse, Post } from "@shared/types";
import { useApi } from "@/lib/useApi";
import { useSite } from "@/lib/site";
import { usePageMeta } from "@/lib/seo";
import { PostCard } from "@/components/Cards";
import { CardSkeletons, EmptyState, ErrorState, PageHero, Reveal } from "@/components/ui";

export default function Blog() {
  usePageMeta("Blog", "Build logs, event recaps and tutorials from the Life Robo robotics club.");
  const { settings } = useSite();
  const { data, error, loading, retry } = useApi<ListResponse<Post>>("/api/posts");
  const items = data?.items ?? [];

  return (
    <>
      <PageHero
        eyebrow="Blog"
        title={
          <>
            Notes from <span className="text-gradient">the workbench.</span>
          </>
        }
        intro="Build logs, event recaps and tutorials written by our members."
      />
      <section className="container-x pb-24 md:pb-32" aria-labelledby="posts-title">
        <h2 id="posts-title" className="sr-only">
          Latest posts
        </h2>
        {loading ? (
          <CardSkeletons count={6} aspect="16/10" />
        ) : error ? (
          <ErrorState error={error} onRetry={retry} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No posts yet"
            body="Our first write-ups are in progress. Follow us to catch them when they land."
            instagram={settings.socials?.instagram}
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p, i) => (
              <Reveal as="li" key={p.id} delay={Math.min(i % 3, 2) * 0.06}>
                <PostCard post={p} />
              </Reveal>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
