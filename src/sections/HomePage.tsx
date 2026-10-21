import { useSite } from "@/lib/site";
import { usePageMeta } from "@/lib/seo";
import { Hero } from "./Hero";
import {
  AlertCard,
  EventsSection,
  FeaturedProjects,
  Highlights,
  JoinCta,
  LatestPosts,
  Process,
  Statement,
  StatsMarquee,
  TeamPreview,
  Tracks,
  VisionCard,
} from "./HomeSections";

/**
 * Home page. Order of sections is defined here only — reorder or drop freely.
 */
export default function HomePage() {
  const { settings } = useSite();
  usePageMeta(settings.seoTitle || settings.siteName, settings.seoDescription);
  return (
    <>
      <Hero />
      <StatsMarquee />
      <Statement />
      <VisionCard />
      <AlertCard />
      <Tracks />
      <Process />
      <EventsSection />
      <FeaturedProjects />
      <Highlights />
      <TeamPreview />
      <LatestPosts />
      <JoinCta />
    </>
  );
}
