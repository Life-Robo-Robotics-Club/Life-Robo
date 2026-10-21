import { Link } from "react-router";
import { useSite } from "@/lib/site";
import { usePageMeta } from "@/lib/seo";
import { safeHref } from "@/lib/format";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { Socials } from "@/components/Layout";
import { ArrowRight, ArrowUpRight, Mail, Pin } from "@/components/icons";
import { PageHero, Reveal, SmartLink } from "@/components/ui";

// Faculty of Engineering & Technology, University of Lucknow (new campus, Jankipuram Vistar).
const LAT = 26.9258;
const LON = 80.9418;
const D = 0.008;
const MAP_EMBED = `https://www.openstreetmap.org/export/embed.html?bbox=${LON - D}%2C${LAT - D / 2}%2C${LON + D}%2C${LAT + D / 2}&layer=mapnik&marker=${LAT}%2C${LON}`;
const MAP_LINK = `https://www.openstreetmap.org/search?query=${encodeURIComponent("Faculty of Engineering and Technology, University of Lucknow")}`;

export default function Contact() {
  const { settings } = useSite();
  usePageMeta("Contact", "Get in touch with Life Robo, the robotics club at the Faculty of Engineering & Technology, University of Lucknow.");
  const email = settings.contactEmail?.trim();
  const links = (settings.importantLinks?.length ? settings.importantLinks : DEFAULT_SETTINGS.importantLinks).filter((l) => safeHref(l.url));
  const hasSocials = Object.values(settings.socials ?? {}).some((v) => safeHref(v) || (v && v.includes("@")));

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={
          <>
            Let's <span className="text-gradient">talk robots.</span>
          </>
        }
        intro="Questions about joining, collaborating or sponsoring an event? We'd love to hear from you."
      />

      <section className="container-x pb-20 md:pb-28" aria-label="Contact details">
        <div className="grid gap-5 md:grid-cols-12">
          <Reveal className="md:col-span-5">
            <div className="card flex h-full flex-col gap-8 p-6 sm:p-10">
              {email && (
                <div>
                  <h2 className="eyebrow mb-3 flex items-center gap-2">
                    <Mail size={16} /> Email
                  </h2>
                  <a href={`mailto:${email}`} className="link break-all text-[19px] font-medium">
                    {email}
                  </a>
                </div>
              )}
              {settings.address && (
                <div>
                  <h2 className="eyebrow mb-3 flex items-center gap-2">
                    <Pin size={16} /> Visit
                  </h2>
                  <address className="text-[17px] not-italic leading-relaxed text-fg/90">{settings.address}</address>
                  <a href={MAP_LINK} target="_blank" rel="noopener noreferrer" className="link mt-3 text-[15px]">
                    Open in OpenStreetMap <ArrowUpRight size={16} />
                  </a>
                </div>
              )}
              {hasSocials && (
                <div>
                  <h2 className="eyebrow mb-3">Follow</h2>
                  <Socials socials={settings.socials} />
                </div>
              )}
              {links.length > 0 && (
                <div>
                  <h2 className="eyebrow mb-3">Important links</h2>
                  <ul className="space-y-2">
                    {links.map((l) => (
                      <li key={l.url}>
                        <SmartLink href={l.url} className="link text-[15px]">
                          {l.label} <ArrowUpRight size={14} />
                        </SmartLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Reveal>

          <Reveal className="md:col-span-7" delay={0.08}>
            <div className="card relative h-full min-h-[360px] md:min-h-[480px]">
              <iframe
                title="Map: Faculty of Engineering and Technology, University of Lucknow"
                src={MAP_EMBED}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full border-0 [filter:invert(0.92)_hue-rotate(180deg)_saturate(0.7)_brightness(0.95)]"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line bg-ink py-20 md:py-28" aria-labelledby="contact-cta">
        <Reveal className="container-x flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 id="contact-cta" className="headline">
              Ready to build?
            </h2>
            <p className="mt-5 text-lg text-muted md:text-xl">
              {settings.joinOpen
                ? "Sign-ups are open. No experience needed — just curiosity."
                : "Sign-ups are closed right now — find out when they reopen."}
            </p>
          </div>
          <Link to="/join" className="btn btn-primary">
            {settings.joinOpen ? "Join the club" : "Membership info"} <ArrowRight size={18} />
          </Link>
        </Reveal>
      </section>
    </>
  );
}
