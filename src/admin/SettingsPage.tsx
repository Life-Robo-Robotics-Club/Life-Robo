import { useState } from "react";
import type { Settings, SocialLinks } from "@shared/types";
import { ApiError, adminApi, errorMessage, fieldErrors } from "./adminApi";
import { useAdminData } from "./hooks";
import { ImagePicker, MultiImageField } from "./ImagePicker";
import { toast } from "./toast";
import { ErrorSummary, Grid, Group, ListEditor, LoadError, PageHeader, SaveBar, TextArea, TextField, Toggle, UnsavedGuard } from "./ui";
import { SAVED_MESSAGE, stableJson } from "./utils";

const SECTIONS = [
  ["brand", "Brand"],
  ["hero", "Hero"],
  ["about", "About"],
  ["stats", "Stats"],
  ["tracks", "Tracks"],
  ["process", "Process"],
  ["facts", "Robo facts"],
  ["links", "Links"],
  ["socials", "Socials"],
  ["contact", "Contact"],
  ["join", "Join"],
  ["collab", "Collaborations"],
  ["certs", "Certificates"],
  ["seo", "SEO"],
] as const;

const SOCIALS: { key: keyof SocialLinks; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/…" },
  { key: "github", label: "GitHub", placeholder: "https://github.com/…" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@…" },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/…" },
  { key: "email", label: "Email", placeholder: "club@example.com" },
];

export default function SettingsPage() {
  const { data, error, loading, reload } = useAdminData<{ item: Settings }>("/api/admin/settings");
  if (error && !data) return <LoadError error={error} onRetry={reload} />;
  if (loading || !data)
    return (
      <div aria-busy="true" className="space-y-6">
        <div className="skeleton h-9 w-56" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="skeleton h-52 w-full" />
        ))}
      </div>
    );
  return <SettingsEditor initial={data.item} />;
}

function SettingsEditor({ initial }: { initial: Settings }) {
  const [baseline, setBaseline] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const changedKeys = (Object.keys(draft) as (keyof Settings)[]).filter((k) => stableJson(draft[k]) !== stableJson(baseline[k]));
  const dirty = changedKeys.length > 0;

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      const hit = Object.keys(e).filter((k) => k === key || k.startsWith(`${key}.`));
      if (!hit.length) return e;
      const n = { ...e };
      hit.forEach((k) => delete n[k]);
      return n;
    });
  };
  const err = (k: string) => errors[k];

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setErrors({});
    const patch = Object.fromEntries(changedKeys.map((k) => [k, draft[k]]));
    try {
      const res = await adminApi.put<{ item: Settings }>("/api/admin/settings", patch);
      setBaseline(res.item);
      setDraft(res.item);
      toast.success(SAVED_MESSAGE);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        const fe = fieldErrors(e);
        setErrors(Object.keys(fe).length ? fe : { "": e.message });
        toast.error("Please fix the highlighted fields.");
        const first = Object.keys(fe)[0]?.split(".")[0];
        const section = first ? document.querySelector(`[data-keys~="${first}"]`) : null;
        section?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (!(e instanceof ApiError && e.status === 401)) {
        toast.error(errorMessage(e));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <UnsavedGuard when={dirty} />
      <PageHeader title="Site content" subtitle="Text, images and links used across the public site. Changes go live within ~30 seconds of saving." />

      <nav aria-label="Jump to section" className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#s-${id}`} className="chip !min-h-[32px] shrink-0 !px-3 !text-[13px]">
            {label}
          </a>
        ))}
      </nav>

      <div className="mb-5">
        <ErrorSummary errors={errors} />
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex flex-col gap-8"
      >
        <div id="s-brand" data-keys="siteName shortName tagline logoUrl" className="scroll-mt-20">
          <Group title="Brand">
            <Grid>
              <TextField label="Site name" value={draft.siteName} onChange={(v) => set("siteName", v)} error={err("siteName")} maxLength={160} />
              <TextField label="Short name" value={draft.shortName} onChange={(v) => set("shortName", v)} error={err("shortName")} maxLength={60} />
            </Grid>
            <TextField label="Tagline" value={draft.tagline} onChange={(v) => set("tagline", v)} error={err("tagline")} maxLength={200} />
            <ImagePicker label="Logo" value={draft.logoUrl} onChange={(v) => set("logoUrl", v)} error={err("logoUrl")} round />
          </Group>
        </div>

        <div id="s-hero" data-keys="heroEyebrow heroHeadline heroSubhead heroPrimaryCta heroSecondaryCta heroImage" className="scroll-mt-20">
          <Group title="Hero" description="The first thing visitors see on the home page.">
            <TextField label="Eyebrow" value={draft.heroEyebrow} onChange={(v) => set("heroEyebrow", v)} error={err("heroEyebrow")} maxLength={120} />
            <TextField label="Headline" value={draft.heroHeadline} onChange={(v) => set("heroHeadline", v)} error={err("heroHeadline")} maxLength={160} />
            <TextArea label="Subhead" value={draft.heroSubhead} onChange={(v) => set("heroSubhead", v)} error={err("heroSubhead")} rows={3} maxLength={500} />
            <Grid>
              <TextField
                label="Primary button label"
                value={draft.heroPrimaryCta.label}
                onChange={(v) => set("heroPrimaryCta", { ...draft.heroPrimaryCta, label: v })}
                error={err("heroPrimaryCta.label")}
              />
              <TextField
                label="Primary button link"
                value={draft.heroPrimaryCta.href}
                onChange={(v) => set("heroPrimaryCta", { ...draft.heroPrimaryCta, href: v })}
                error={err("heroPrimaryCta.href")}
                placeholder="/join"
              />
              <TextField
                label="Secondary button label"
                value={draft.heroSecondaryCta.label}
                onChange={(v) => set("heroSecondaryCta", { ...draft.heroSecondaryCta, label: v })}
                error={err("heroSecondaryCta.label")}
              />
              <TextField
                label="Secondary button link"
                value={draft.heroSecondaryCta.href}
                onChange={(v) => set("heroSecondaryCta", { ...draft.heroSecondaryCta, href: v })}
                error={err("heroSecondaryCta.href")}
                placeholder="/events"
              />
            </Grid>
            <ImagePicker label="Hero image" value={draft.heroImage} onChange={(v) => set("heroImage", v)} error={err("heroImage")} />
          </Group>
        </div>

        <div id="s-about" data-keys="aboutHeading aboutBody aboutImage vision mission" className="scroll-mt-20">
          <Group title="About">
            <TextField label="Heading" value={draft.aboutHeading} onChange={(v) => set("aboutHeading", v)} error={err("aboutHeading")} maxLength={200} />
            <TextArea label="Body" value={draft.aboutBody} onChange={(v) => set("aboutBody", v)} error={err("aboutBody")} rows={6} maxLength={3000} />
            <ImagePicker label="Image" value={draft.aboutImage} onChange={(v) => set("aboutImage", v)} error={err("aboutImage")} />
            <Grid>
              <TextArea label="Vision" value={draft.vision} onChange={(v) => set("vision", v)} error={err("vision")} rows={4} maxLength={1000} />
              <TextArea label="Mission" value={draft.mission} onChange={(v) => set("mission", v)} error={err("mission")} rows={4} maxLength={1000} />
            </Grid>
          </Group>
        </div>

        <div id="s-stats" data-keys="stats" className="scroll-mt-20">
          <Group title="Stats" description="Big numbers on the home page, e.g. “120+ / Members”. Up to 8.">
            <ListEditor
              items={draft.stats}
              onChange={(v) => set("stats", v)}
              blank={() => ({ value: "", label: "" })}
              addLabel="Add stat"
              itemName="stat"
              max={8}
              error={err("stats")}
              render={(s, update, i) => (
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
                  <TextField label="Value" value={s.value} onChange={(v) => update({ ...s, value: v })} error={err(`stats.${i}.value`)} maxLength={20} placeholder="120+" />
                  <TextField label="Label" value={s.label} onChange={(v) => update({ ...s, label: v })} error={err(`stats.${i}.label`)} maxLength={60} placeholder="Members" />
                </div>
              )}
            />
          </Group>
        </div>

        <div id="s-tracks" data-keys="tracks" className="scroll-mt-20">
          <Group title="Tracks" description="What members can work on. Up to 12.">
            <ListEditor
              items={draft.tracks}
              onChange={(v) => set("tracks", v)}
              blank={() => ({ title: "", description: "" })}
              addLabel="Add track"
              itemName="track"
              max={12}
              error={err("tracks")}
              render={(t, update, i) => (
                <div className="flex flex-col gap-3">
                  <TextField label="Title" value={t.title} onChange={(v) => update({ ...t, title: v })} error={err(`tracks.${i}.title`)} maxLength={80} />
                  <TextArea
                    label="Description"
                    value={t.description}
                    onChange={(v) => update({ ...t, description: v })}
                    error={err(`tracks.${i}.description`)}
                    rows={2}
                    maxLength={300}
                  />
                </div>
              )}
            />
          </Group>
        </div>

        <div id="s-process" data-keys="process" className="scroll-mt-20">
          <Group title="Process" description="How the club works, step by step. Up to 8.">
            <ListEditor
              items={draft.process}
              onChange={(v) => set("process", v)}
              blank={() => ({ title: "", description: "" })}
              addLabel="Add step"
              itemName="step"
              max={8}
              error={err("process")}
              render={(t, update, i) => (
                <div className="flex flex-col gap-3">
                  <TextField label={`Step ${i + 1} title`} value={t.title} onChange={(v) => update({ ...t, title: v })} error={err(`process.${i}.title`)} maxLength={80} />
                  <TextArea
                    label="Description"
                    value={t.description}
                    onChange={(v) => update({ ...t, description: v })}
                    error={err(`process.${i}.description`)}
                    rows={2}
                    maxLength={300}
                  />
                </div>
              )}
            />
          </Group>
        </div>

        <div id="s-facts" data-keys="roboFacts" className="scroll-mt-20">
          <Group title="Robo facts" description="Fun facts the site's robot mascot shares. Up to 40.">
            <ListEditor
              items={draft.roboFacts}
              onChange={(v) => set("roboFacts", v)}
              blank={() => ""}
              addLabel="Add fact"
              itemName="fact"
              max={40}
              error={err("roboFacts")}
              render={(f, update, i) => (
                <TextArea label={`Fact ${i + 1}`} value={f} onChange={update} error={err(`roboFacts.${i}`)} rows={2} maxLength={300} />
              )}
            />
          </Group>
        </div>

        <div id="s-links" data-keys="importantLinks" className="scroll-mt-20">
          <Group title="Important links" description="Shown in the footer — forms, notices, university pages. Up to 12.">
            <ListEditor
              items={draft.importantLinks}
              onChange={(v) => set("importantLinks", v)}
              blank={() => ({ label: "", url: "" })}
              addLabel="Add link"
              itemName="link"
              max={12}
              error={err("importantLinks")}
              render={(l, update, i) => (
                <Grid>
                  <TextField label="Label" value={l.label} onChange={(v) => update({ ...l, label: v })} error={err(`importantLinks.${i}.label`)} maxLength={80} />
                  <TextField label="URL" value={l.url} onChange={(v) => update({ ...l, url: v })} error={err(`importantLinks.${i}.url`)} inputMode="url" placeholder="https://…" />
                </Grid>
              )}
            />
          </Group>
        </div>

        <div id="s-socials" data-keys="socials" className="scroll-mt-20">
          <Group title="Socials" description="Leave empty to hide an icon.">
            <Grid>
              {SOCIALS.map((s) => (
                <TextField
                  key={s.key}
                  label={s.label}
                  value={draft.socials[s.key] ?? ""}
                  onChange={(v) => set("socials", { ...draft.socials, [s.key]: v })}
                  error={err(`socials.${s.key}`)}
                  placeholder={s.placeholder}
                  inputMode={s.key === "email" ? "email" : "url"}
                />
              ))}
            </Grid>
          </Group>
        </div>

        <div id="s-contact" data-keys="contactEmail address" className="scroll-mt-20">
          <Group title="Contact">
            <TextField
              label="Email"
              type="email"
              value={draft.contactEmail}
              onChange={(v) => set("contactEmail", v)}
              error={err("contactEmail")}
              placeholder="liferobo@example.com"
            />
            <TextArea label="Address" value={draft.address} onChange={(v) => set("address", v)} error={err("address")} rows={3} maxLength={300} />
          </Group>
        </div>

        <div id="s-join" data-keys="joinOpen joinHeading joinBody" className="scroll-mt-20">
          <Group title="Join" description="The sign-up page and the default join strip.">
            <Toggle
              label="Sign-ups open"
              description={draft.joinOpen ? "The join form accepts new members." : "The join form is closed; visitors see a message instead."}
              checked={draft.joinOpen}
              onChange={(v) => set("joinOpen", v)}
            />
            <TextField label="Heading" value={draft.joinHeading} onChange={(v) => set("joinHeading", v)} error={err("joinHeading")} maxLength={120} />
            <TextArea label="Body" value={draft.joinBody} onChange={(v) => set("joinBody", v)} error={err("joinBody")} rows={4} maxLength={1000} />
          </Group>
        </div>

        <div
          id="s-collab"
          data-keys="collabHeading collabIntro collabGoals seriesName seriesTagline seriesBody seriesKey seriesImages seriesLinks"
          className="scroll-mt-20 flex flex-col gap-8"
        >
          <Group title="Collaborations page" description="Intro and goals for the Collaborations page. Partners themselves are edited under Partners.">
            <TextField label="Heading" value={draft.collabHeading} onChange={(v) => set("collabHeading", v)} error={err("collabHeading")} maxLength={160} />
            <TextArea label="Intro" value={draft.collabIntro} onChange={(v) => set("collabIntro", v)} error={err("collabIntro")} rows={4} maxLength={1000} />
            <ListEditor
              items={draft.collabGoals}
              onChange={(v) => set("collabGoals", v)}
              blank={() => ({ title: "", description: "" })}
              addLabel="Add goal"
              itemName="goal"
              max={8}
              error={err("collabGoals")}
              render={(g, update, i) => (
                <div className="flex flex-col gap-3">
                  <TextField label="Title" value={g.title} onChange={(v) => update({ ...g, title: v })} error={err(`collabGoals.${i}.title`)} maxLength={80} />
                  <TextArea
                    label="Description"
                    value={g.description}
                    onChange={(v) => update({ ...g, description: v })}
                    error={err(`collabGoals.${i}.description`)}
                    rows={2}
                    maxLength={300}
                  />
                </div>
              )}
            />
          </Group>

          <Group title="Workshop series" description="Shown on the Collaborations page. Leave the name empty to hide this section.">
            <Grid>
              <TextField label="Series name" value={draft.seriesName} onChange={(v) => set("seriesName", v)} error={err("seriesName")} maxLength={60} placeholder="Vortex" />
              <TextField label="Tagline" value={draft.seriesTagline} onChange={(v) => set("seriesTagline", v)} error={err("seriesTagline")} maxLength={120} />
            </Grid>
            <TextArea
              label="Body"
              value={draft.seriesBody}
              onChange={(v) => set("seriesBody", v)}
              error={err("seriesBody")}
              rows={8}
              maxLength={3000}
              hint="Separate paragraphs with a blank line."
            />
            <TextField
              label="Series key"
              value={draft.seriesKey}
              onChange={(v) => set("seriesKey", v.toLowerCase().replace(/\s+/g, "-"))}
              error={err("seriesKey")}
              maxLength={40}
              placeholder="vortex"
              className="font-mono"
              hint="Events whose Series field matches this key are listed as sessions, e.g. vortex."
            />
            <MultiImageField label="Photos" value={draft.seriesImages} onChange={(v) => set("seriesImages", v)} error={err("seriesImages")} max={40} />
            <ListEditor
              items={draft.seriesLinks}
              onChange={(v) => set("seriesLinks", v)}
              blank={() => ({ label: "", url: "" })}
              addLabel="Add link"
              itemName="link"
              max={6}
              error={err("seriesLinks")}
              render={(l, update, i) => (
                <Grid>
                  <TextField label="Label" value={l.label} onChange={(v) => update({ ...l, label: v })} error={err(`seriesLinks.${i}.label`)} maxLength={80} />
                  <TextField label="URL" value={l.url} onChange={(v) => update({ ...l, url: v })} error={err(`seriesLinks.${i}.url`)} inputMode="url" placeholder="https://…" />
                </Grid>
              )}
            />
          </Group>
        </div>

        <div id="s-certs" data-keys="certSignatories" className="scroll-mt-20">
          <Group
            title="Certificates"
            description="Printed on every certificate. Partner logos come from Partners (those marked On certificates)."
            footer="Leave empty for a certificate without signature lines."
          >
            <ListEditor
              items={draft.certSignatories}
              onChange={(v) => set("certSignatories", v)}
              blank={() => ({ name: "", title: "" })}
              addLabel="Add signatory"
              itemName="signatory"
              max={3}
              error={err("certSignatories")}
              render={(s, update, i) => (
                <Grid>
                  <TextField label="Name" value={s.name} onChange={(v) => update({ ...s, name: v })} error={err(`certSignatories.${i}.name`)} maxLength={80} />
                  <TextField
                    label="Title"
                    value={s.title}
                    onChange={(v) => update({ ...s, title: v })}
                    error={err(`certSignatories.${i}.title`)}
                    maxLength={120}
                    placeholder="Faculty Convenor, Life Robo"
                  />
                </Grid>
              )}
            />
          </Group>
        </div>

        <div id="s-seo" data-keys="seoTitle seoDescription ogImage" className="scroll-mt-20">
          <Group title="SEO & sharing" description="How the site appears in Google and link previews.">
            <TextField label="Title" value={draft.seoTitle} onChange={(v) => set("seoTitle", v)} error={err("seoTitle")} maxLength={120} hint={`${draft.seoTitle.length}/120 · aim for under 60`} />
            <TextArea
              label="Description"
              value={draft.seoDescription}
              onChange={(v) => set("seoDescription", v)}
              error={err("seoDescription")}
              rows={3}
              maxLength={300}
            />
            <ImagePicker label="Share image (1200×630)" value={draft.ogImage} onChange={(v) => set("ogImage", v)} error={err("ogImage")} aspect="1200/630" />
          </Group>
        </div>

        <SaveBar
          dirty={dirty}
          saving={saving}
          onSave={() => void save()}
          onDiscard={() => {
            setDraft(baseline);
            setErrors({});
          }}
          alwaysShow
          label={dirty ? `Save ${changedKeys.length} change${changedKeys.length === 1 ? "" : "s"}` : "Saved"}
        />
      </form>
    </div>
  );
}
