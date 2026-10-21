import { Link } from "react-router";
import { usePageMeta } from "@/lib/seo";
import { ArrowRight } from "@/components/icons";
import { Reveal } from "@/components/ui";

export default function NotFound({ what }: { what?: string }) {
  usePageMeta("Page not found", "The page you were looking for doesn't exist.");
  return (
    <section className="relative flex min-h-[80vh] items-center overflow-hidden pb-24 pt-36" aria-labelledby="nf-title">
      <div className="tech-grid mask-fade-b pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[720px] max-w-full -translate-x-1/2 rounded-full opacity-40 blur-[120px]"
        style={{ background: "radial-gradient(closest-side, rgb(41 151 255 / 0.45), rgb(139 92 246 / 0.2), transparent)" }}
        aria-hidden="true"
      />
      <div className="container-x relative text-center">
        <Reveal>
          <p className="text-gradient text-[clamp(6rem,24vw,14rem)] font-semibold leading-none tracking-[-0.05em]" aria-hidden="true">
            404
          </p>
          <h1 id="nf-title" className="title mt-4">
            {what ? `We couldn't find that ${what}.` : "This page wandered off the circuit."}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-muted">
            The link may be broken or the page may have moved. Let's get you back on track.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn btn-primary">
              Back to home
            </Link>
            <Link to="/events" className="btn btn-ghost">
              See events <ArrowRight size={18} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
