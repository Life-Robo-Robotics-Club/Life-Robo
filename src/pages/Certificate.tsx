import { useEffect } from "react";
import { Link, useParams } from "react-router";
import type { Certificate as Cert, ItemResponse } from "@shared/types";
import { useApi } from "@/lib/useApi";
import { useSite } from "@/lib/site";
import { fmtDate } from "@/lib/format";
import { ChevronLeft } from "@/components/icons";
import { ErrorState } from "@/components/ui";
import { is404 } from "./_shared";

// Rendered outside the site layout so it prints cleanly. The sheet is sized in container
// units (cqw) so the screen preview and the A4 landscape print are the same layout.

function Logo({ src, alt, round }: { src: string; alt: string; round?: boolean }) {
  return <img src={src} alt={alt} className={`h-[7.5cqw] w-auto max-w-[16cqw] object-contain ${round ? "rounded-full" : ""}`} />;
}

function Sheet({ cert }: { cert: Cert }) {
  const { settings, data } = useSite();
  const partners = (data?.partners ?? []).filter((p) => p.onCertificate && p.logo);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const date = fmtDate(cert.event.startsAt, { day: "numeric", month: "long", year: "numeric" });
  const signatories = settings.certSignatories.filter((s) => s.name.trim());
  const names = partners.map((p) => p.name);
  const withPartners = names.length ? ` in collaboration with ${names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0]}` : "";

  return (
    <div className="cert-wrap mx-auto w-full max-w-[1123px] [container-type:inline-size]">
      <div className="cert-sheet relative aspect-[297/210] w-full overflow-hidden bg-white text-[#1d1d1f] shadow-2xl">
        {/* Frame */}
        <div className="absolute inset-[2.2cqw] border-[0.25cqw] border-[#0b2a5b]" aria-hidden="true" />
        <div className="absolute inset-[2.9cqw] border-[0.08cqw] border-[#b08d3c]" aria-hidden="true" />

        <div className="absolute inset-[4.5cqw] flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-[3cqw]">
            <Logo src="/brand/logo-hd.jpg" alt={`${settings.shortName} logo`} round />
            {partners.map((p) => (
              <Logo key={p.id} src={p.logo} alt={`${p.name} logo`} />
            ))}
          </div>

          <p className="mt-[2.6cqw] text-[1.25cqw] font-semibold uppercase tracking-[0.5em] text-[#0b2a5b]">Certificate of Participation</p>
          <p className="mt-[2.4cqw] text-[1.45cqw] text-[#55555a]">This is to certify that</p>
          <p className="mt-[1cqw] max-w-[80cqw] font-serif text-[4.4cqw] font-semibold leading-[1.1] text-[#0b2a5b]">{cert.name}</p>
          <div className="mt-[1.2cqw] h-[0.1cqw] w-[38cqw] bg-[#b08d3c]" aria-hidden="true" />
          <p className="mt-[1.8cqw] text-[1.45cqw] text-[#55555a]">has participated in</p>
          <p className="mt-[0.8cqw] max-w-[78cqw] text-[2.3cqw] font-semibold leading-snug">{cert.event.title}</p>
          <p className="mt-[1.2cqw] max-w-[76cqw] text-[1.3cqw] leading-relaxed text-[#55555a]">
            held on {date}
            {cert.event.venue ? ` at ${cert.event.venue}` : ""}, organised by Life Robo Robotics Club, Faculty of Engineering and Technology, University of
            Lucknow{withPartners}.
          </p>

          <div className="mt-auto flex w-full items-end justify-between gap-[3cqw]">
            <div className="text-left text-[0.95cqw] leading-relaxed text-[#6e6e73]">
              <p>
                Certificate ID: <span className="font-mono font-semibold text-[#1d1d1f]">{cert.code}</span>
              </p>
              <p>Verify at {origin.replace(/^https?:\/\//, "")}/certificates/{cert.code}</p>
            </div>
            {signatories.length > 0 && (
              <div className="flex gap-[4cqw]">
                {signatories.map((s, i) => (
                  <div key={i} className="min-w-[16cqw] text-center">
                    <div className="mb-[0.6cqw] h-[0.1cqw] w-full bg-[#1d1d1f]" aria-hidden="true" />
                    <p className="text-[1.15cqw] font-semibold">{s.name}</p>
                    {s.title && <p className="text-[0.95cqw] text-[#6e6e73]">{s.title}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CertificatePage() {
  const { code = "" } = useParams();
  const { data, error, loading, retry } = useApi<ItemResponse<Cert>>(`/api/certificates/${encodeURIComponent(code)}`);
  const cert = data?.item;

  // The tab title becomes the default file name when saving as PDF.
  useEffect(() => {
    document.title = cert ? `Certificate - ${cert.name} - ${cert.event.title}` : "Certificate - Life Robo";
  }, [cert]);

  return (
    <main className="min-h-dvh bg-canvas px-4 py-6 text-fg sm:px-8 sm:py-10 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-6 flex max-w-[1123px] flex-wrap items-center justify-between gap-3">
        <Link to="/" className="inline-flex min-h-11 items-center gap-1 text-[15px] text-muted hover:text-fg">
          <ChevronLeft size={18} /> Life Robo
        </Link>
        {cert && (
          <div className="flex items-center gap-3">
            <p className="hidden text-[13px] text-dim sm:block">In the print window, pick “Save as PDF”.</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
              Download PDF
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="skeleton mx-auto aspect-[297/210] w-full max-w-[1123px]" role="status" aria-label="Loading certificate" />
      ) : error && is404(error) ? (
        <div className="card mx-auto max-w-lg px-6 py-14 text-center">
          <h1 className="title">Certificate not found</h1>
          <p className="mt-3 text-muted">
            Check the link or the certificate ID. Certificates appear once attendance for the event has been marked.
          </p>
        </div>
      ) : error || !cert ? (
        <div className="mx-auto max-w-lg">
          <ErrorState error={error} onRetry={retry} />
        </div>
      ) : (
        <>
          <h1 className="sr-only">
            Certificate of participation for {cert.name}, {cert.event.title}
          </h1>
          <Sheet cert={cert} />
          <p className="no-print mx-auto mt-4 max-w-[1123px] text-center text-[13px] text-dim">
            Issued {fmtDate(cert.issuedAt)} · {cert.code}
          </p>
        </>
      )}
    </main>
  );
}
