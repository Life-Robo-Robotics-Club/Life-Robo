import { useMemo, useState } from "react";
import type { GalleryImage, ListResponse } from "@shared/types";
import { useApi } from "@/lib/useApi";
import { useSite } from "@/lib/site";
import { usePageMeta } from "@/lib/seo";
import { EmptyState, ErrorState, Img, PageHero, Reveal, Skeleton } from "@/components/ui";
import { Lightbox, type LightboxItem } from "./_Lightbox";

// Varied aspect ratios give the column layout its masonry rhythm.
const ASPECTS = ["4/5", "1/1", "4/3", "3/4", "16/11", "1/1"];
const SKELETON_ASPECTS = ["4/5", "1/1", "4/3", "3/4", "4/3", "4/5"];

export default function Gallery() {
  usePageMeta("Gallery", "Photos from Life Robo workshops, competitions and build nights.");
  const { settings } = useSite();
  const { data, error, loading, retry } = useApi<ListResponse<GalleryImage>>("/api/gallery");
  const [open, setOpen] = useState<number | null>(null);

  const images = useMemo(() => (data?.items ?? []).filter((g) => g.url), [data]);
  const items: LightboxItem[] = useMemo(
    () => images.map((g) => ({ src: g.url, alt: g.alt || g.caption || "Life Robo photo", caption: g.caption })),
    [images],
  );

  return (
    <>
      <PageHero
        eyebrow="Gallery"
        title={
          <>
            Moments from <span className="text-gradient">the lab.</span>
          </>
        }
        intro="Workshops, competitions and late-night builds — captured along the way."
      />
      <section className="container-x pb-24 md:pb-32" aria-label="Photo gallery">
        {loading ? (
          <div role="status" aria-label="Loading" className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
            {SKELETON_ASPECTS.map((a, i) => (
              <Skeleton key={i} className="break-inside-avoid !rounded-[24px]" style={{ aspectRatio: a }} />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={retry} />
        ) : images.length === 0 ? (
          <EmptyState
            title="No photos yet"
            body="Our next event will fill this page up. Meanwhile, follow along on Instagram."
            instagram={settings.socials?.instagram}
          />
        ) : (
          <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {images.map((g, i) => (
              <li key={g.id} className="mb-4 break-inside-avoid">
                <Reveal y={20} delay={Math.min(i % 3, 2) * 0.05}>
                  <button
                    type="button"
                    onClick={() => setOpen(i)}
                    className="group relative block w-full overflow-hidden rounded-[24px] border border-line text-left"
                    aria-label={`Open photo: ${g.caption || g.alt || `${i + 1} of ${images.length}`}`}
                  >
                    <Img
                      src={g.url}
                      alt={g.alt || g.caption || ""}
                      aspect={ASPECTS[i % ASPECTS.length]}
                      imgClassName="group-hover:scale-[1.04]"
                    />
                    {g.caption && (
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-5 pb-4 pt-12 text-[14px] text-fg opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
                        {g.caption}
                      </span>
                    )}
                  </button>
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Lightbox items={items} index={open} onClose={() => setOpen(null)} onNavigate={setOpen} />
    </>
  );
}
