import { useMemo } from "react";
import type { ListResponse, TeamMember } from "@shared/types";
import { useApi } from "@/lib/useApi";
import { usePageMeta } from "@/lib/seo";
import { safeHref } from "@/lib/format";
import { GitHub, Instagram, LinkedIn } from "@/components/icons";
import { EmptyState, ErrorState, Img, PageHero, Reveal, Skeleton, SmartLink } from "@/components/ui";

const ORDER = ["faculty", "leads", "core"];
const GROUP_TITLES: Record<string, string> = {
  faculty: "Faculty mentors",
  leads: "Club leads",
  core: "Core team",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function Avatar({ member }: { member: TeamMember }) {
  if (member.photo) {
    return <Img src={member.photo} alt={`Portrait of ${member.name}`} aspect="1/1" className="w-full rounded-full" />;
  }
  return (
    <div
      className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-full border border-line"
      style={{ background: "radial-gradient(120% 120% at 30% 20%, rgb(41 151 255 / 0.35), rgb(139 92 246 / 0.22) 45%, #141416 80%)" }}
      role="img"
      aria-label={member.name}
    >
      <span className="text-[clamp(2rem,6vw,3rem)] font-semibold tracking-tight text-fg/90" aria-hidden="true">
        {initials(member.name)}
      </span>
    </div>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  const socials = [
    { href: member.linkedin, label: "LinkedIn", Icon: LinkedIn },
    { href: member.github, label: "GitHub", Icon: GitHub },
    { href: member.instagram, label: "Instagram", Icon: Instagram },
  ].filter((s) => safeHref(s.href));
  return (
    <article className="card flex h-full flex-col items-center px-6 pb-8 pt-8 text-center">
      <div className="w-36 sm:w-40">
        <Avatar member={member} />
      </div>
      <h3 className="mt-6 text-[21px] font-semibold leading-tight tracking-tight">{member.name}</h3>
      {member.role && <p className="mt-1 text-[15px] font-medium text-accent">{member.role}</p>}
      {member.bio && <p className="mt-3 line-clamp-4 text-[15px] text-muted">{member.bio}</p>}
      {socials.length > 0 && (
        <ul className="mt-auto flex gap-2 pt-6">
          {socials.map(({ href, label, Icon }) => (
            <li key={label}>
              <SmartLink
                href={href}
                ariaLabel={`${member.name} on ${label}`}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-muted transition-colors hover:bg-white/[0.12] hover:text-fg"
              >
                <Icon size={18} />
              </SmartLink>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function TeamSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="card flex flex-col items-center gap-4 px-6 py-8">
          <Skeleton className="h-36 w-36 !rounded-full sm:h-40 sm:w-40" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export default function Team() {
  usePageMeta("Team", "Meet the faculty mentors, leads and core members behind Life Robo.");
  const { data, error, loading, retry } = useApi<ListResponse<TeamMember>>("/api/team");

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; members: TeamMember[] }>();
    for (const m of data?.items ?? []) {
      const label = m.group?.trim() || "Members";
      const key = label.toLowerCase();
      if (!map.has(key)) map.set(key, { label, members: [] });
      map.get(key)!.members.push(m);
    }
    const rank = (k: string) => {
      const i = ORDER.indexOf(k);
      return i === -1 ? ORDER.length : i;
    };
    return Array.from(map.entries())
      .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
      .map(([key, g]) => ({ key, title: GROUP_TITLES[key] ?? g.label, members: g.members }));
  }, [data]);

  return (
    <>
      <PageHero
        eyebrow="The people"
        title={
          <>
            Meet the <span className="text-gradient">Team.</span>
          </>
        }
        intro="Mentors, leads and makers who keep the soldering irons warm and the ideas moving."
      />
      <div className="container-x space-y-20 pb-24 md:space-y-28 md:pb-32">
        {loading ? (
          <TeamSkeleton />
        ) : error ? (
          <ErrorState error={error} onRetry={retry} />
        ) : groups.length === 0 ? (
          <EmptyState title="Team announcement coming soon" body="We're putting together this year's team. Check back shortly." />
        ) : (
          groups.map((g) => (
            <section key={g.key} aria-labelledby={`team-${g.key}`}>
              <Reveal>
                <h2 id={`team-${g.key}`} className="title mb-8 md:mb-10">
                  {g.title}
                </h2>
              </Reveal>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {g.members.map((m, i) => (
                  <Reveal as="li" key={m.id} delay={Math.min(i % 3, 2) * 0.06}>
                    <MemberCard member={m} />
                  </Reveal>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </>
  );
}
