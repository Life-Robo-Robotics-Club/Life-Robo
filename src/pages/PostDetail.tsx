import { useParams } from "react-router";
import type { ItemResponse, Post } from "@shared/types";
import { useApi } from "@/lib/useApi";
import { usePageMeta } from "@/lib/seo";
import { fmtDate } from "@/lib/format";
import { ErrorState, Img, Reveal, Skeleton } from "@/components/ui";
import NotFound from "./NotFound";
import { BackLink, DetailShell, Markdown, is404 } from "./_shared";

function PostSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto mt-8 max-w-3xl space-y-5">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-14 w-4/5" />
      <Skeleton className="!rounded-[28px]" style={{ aspectRatio: "16/9" }} />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export default function PostDetail() {
  const { slug = "" } = useParams();
  const { data, error, loading, retry } = useApi<ItemResponse<Post>>(`/api/posts/${encodeURIComponent(slug)}`);
  const post = data?.item;
  usePageMeta(post?.title ?? "Blog", post?.excerpt);

  if (error && is404(error)) return <NotFound what="post" />;

  return (
    <DetailShell>
      <div className="mx-auto max-w-3xl">
        <BackLink to="/blog" label="All posts" />
      </div>
      {loading ? (
        <PostSkeleton />
      ) : error || !post ? (
        <div className="mt-8">
          <ErrorState error={error} onRetry={retry} />
        </div>
      ) : (
        <>
          <Reveal className="mx-auto mt-8 max-w-3xl">
            <p className="text-[15px] text-muted">
              <time dateTime={post.publishedAt}>{fmtDate(post.publishedAt, { month: "long" })}</time>
              {post.author && <> · By {post.author}</>}
            </p>
            <h1 className="headline mt-4">{post.title}</h1>
            {post.excerpt && <p className="mt-6 text-lg text-muted md:text-xl">{post.excerpt}</p>}
          </Reveal>
          {post.cover && (
            <Reveal className="mx-auto mt-12 max-w-5xl" delay={0.08}>
              <Img src={post.cover} alt={post.coverAlt || post.title} aspect="16/9" priority className="rounded-[28px] border border-line" />
            </Reveal>
          )}
          <Markdown source={post.body} className="prose-lr mx-auto mt-14 max-w-2xl" />
        </>
      )}
    </DetailShell>
  );
}
