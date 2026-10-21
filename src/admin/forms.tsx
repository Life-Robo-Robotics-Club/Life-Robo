import { useId } from "react";
import type { Alert, ClubEvent, GalleryImage, Partner, Post, Project, TeamMember } from "@shared/types";
import type { FormProps } from "./Collection";
import { AlertStrip } from "./AlertPreview";
import { ImagePicker, MultiImageField } from "./ImagePicker";
import { useAdminData } from "./hooks";
import {
  DateTimeField,
  Grid,
  Group,
  ListEditor,
  MarkdownField,
  NumberField,
  SelectField,
  TagInput,
  TextArea,
  TextField,
  Toggle,
} from "./ui";
import { alertState, slugError, slugify } from "./utils";

/* ---------- Shared pieces ---------- */

function TitleSlug({
  title,
  slug,
  set,
  errors,
  isNew,
  prefix,
  titleLabel = "Title",
}: {
  title: string;
  slug: string;
  set: (p: { title?: string; slug?: string }) => void;
  errors: Record<string, string>;
  isNew: boolean;
  prefix: string;
  titleLabel?: string;
}) {
  const auto = isNew && slug === slugify(title);
  const localSlugErr = slug ? slugError(slug) : null;
  return (
    <>
      <TextField
        label={titleLabel}
        value={title}
        onChange={(v) => set(auto ? { title: v, slug: slugify(v) } : { title: v })}
        error={errors.title}
        required
        maxLength={200}
      />
      <div>
        <TextField
          label="URL slug"
          value={slug}
          onChange={(v) => set({ slug: v.toLowerCase().replace(/\s+/g, "-") })}
          error={errors.slug || localSlugErr || undefined}
          hint={
            <>
              {prefix}
              <span className="text-muted">{slug || "…"}</span>
              {auto ? " · generated from the title" : ""}
              {!isNew ? " · changing it breaks old links" : ""}
            </>
          }
          spellCheck={false}
          autoCapitalize="off"
          maxLength={120}
          className="font-mono text-[14px]"
        />
        {!auto && title && slug !== slugify(title) && (
          <button type="button" className="mt-1 text-[13px] text-accent hover:underline" onClick={() => set({ slug: slugify(title) })}>
            Reset slug from title
          </button>
        )}
      </div>
    </>
  );
}

function CoverFields({
  cover,
  coverAlt,
  set,
  errors,
}: {
  cover: string;
  coverAlt: string;
  set: (p: { cover?: string; coverAlt?: string }) => void;
  errors: Record<string, string>;
}) {
  return (
    <>
      <ImagePicker label="Cover image" value={cover} onChange={(v) => set({ cover: v })} error={errors.cover} />
      <TextField
        label="Cover alt text"
        value={coverAlt}
        onChange={(v) => set({ coverAlt: v })}
        error={errors.coverAlt}
        hint="Describe the image for screen readers."
        optional
        maxLength={300}
      />
    </>
  );
}

const twoCol = "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]";

/* ---------- Events ---------- */

export function EventForm({ draft, set, errors, isNew }: FormProps<ClubEvent>) {
  return (
    <div className={twoCol}>
      <div className="flex min-w-0 flex-col gap-6">
        <Group title="Details">
          <TitleSlug title={draft.title} slug={draft.slug} set={set} errors={errors} isNew={isNew} prefix="/events/" />
          <TextField label="Venue" value={draft.venue} onChange={(v) => set({ venue: v })} error={errors.venue} optional maxLength={300} />
          <TextArea
            label="Summary"
            value={draft.summary}
            onChange={(v) => set({ summary: v })}
            error={errors.summary}
            rows={3}
            maxLength={600}
            hint="One or two lines shown on event cards."
          />
          <TextField
            label="Series"
            value={draft.series}
            onChange={(v) => set({ series: v.toLowerCase().replace(/\s+/g, "-") })}
            error={errors.series}
            placeholder="vortex"
            hint="Events with the same series are listed together. Use the series key from Site content (e.g. vortex) to show it on the Collaborations page."
            optional
            spellCheck={false}
            autoCapitalize="off"
            maxLength={40}
          />
        </Group>
        <Group title="Registration">
          <Toggle
            label="Register on this site"
            description="Show a registration form on the event page. People get a confirmation email, and you take attendance under Attendance."
            checked={draft.registrationOpen}
            onChange={(v) => set({ registrationOpen: v })}
          />
          {!draft.registrationOpen && (
            <TextField
              label="External registration link"
              value={draft.registerUrl}
              onChange={(v) => set({ registerUrl: v })}
              error={errors.registerUrl}
              placeholder="https://forms.gle/…"
              optional
              inputMode="url"
            />
          )}
        </Group>
        <Group title="Write-up">
          <MarkdownField label="Body" value={draft.body} onChange={(v) => set({ body: v })} error={errors.body} />
        </Group>
        <Group title="Photos" description="Shown as a gallery on the event page.">
          <MultiImageField label="Event images" value={draft.images} onChange={(v) => set({ images: v })} error={errors.images} />
        </Group>
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <Group title="Publishing">
          <Toggle label="Published" description="Visible on the public site." checked={draft.published} onChange={(v) => set({ published: v })} />
          <Toggle label="Featured" description="Highlighted on the home page." checked={draft.featured} onChange={(v) => set({ featured: v })} />
        </Group>
        <Group title="When">
          <DateTimeField label="Starts" value={draft.startsAt} onChange={(v) => v && set({ startsAt: v })} error={errors.startsAt} />
          <DateTimeField label="Ends" value={draft.endsAt} onChange={(v) => set({ endsAt: v })} error={errors.endsAt} nullable />
        </Group>
        <Group title="Cover">
          <CoverFields cover={draft.cover} coverAlt={draft.coverAlt} set={set} errors={errors} />
        </Group>
      </div>
    </div>
  );
}

/* ---------- Projects ---------- */

export function ProjectForm({ draft, set, errors, isNew }: FormProps<Project>) {
  return (
    <div className={twoCol}>
      <div className="flex min-w-0 flex-col gap-6">
        <Group title="Details">
          <TitleSlug title={draft.title} slug={draft.slug} set={set} errors={errors} isNew={isNew} prefix="/projects/" />
          <TextField
            label="Category"
            value={draft.category}
            onChange={(v) => set({ category: v })}
            error={errors.category}
            placeholder="e.g. Autonomous, Combat, IoT"
            list="project-categories"
            maxLength={80}
          />
          <datalist id="project-categories">
            {["Autonomous", "Combat", "Drones", "IoT", "Line follower", "Manual", "Research"].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <TextArea label="Summary" value={draft.summary} onChange={(v) => set({ summary: v })} error={errors.summary} rows={3} maxLength={600} />
          <TagInput label="Tags" value={draft.tags} onChange={(v) => set({ tags: v })} error={errors.tags} />
        </Group>
        <Group title="Links" description="Code, demo video, report…">
          <ListEditor
            items={draft.links}
            onChange={(v) => set({ links: v })}
            blank={() => ({ label: "", url: "" })}
            addLabel="Add link"
            itemName="link"
            max={10}
            error={errors.links}
            render={(l, update, i) => (
              <Grid>
                <TextField label="Label" value={l.label} onChange={(v) => update({ ...l, label: v })} error={errors[`links.${i}.label`]} placeholder="GitHub" />
                <TextField label="URL" value={l.url} onChange={(v) => update({ ...l, url: v })} error={errors[`links.${i}.url`]} placeholder="https://…" inputMode="url" />
              </Grid>
            )}
          />
        </Group>
        <Group title="Write-up">
          <MarkdownField label="Body" value={draft.body} onChange={(v) => set({ body: v })} error={errors.body} />
        </Group>
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <Group title="Publishing">
          <Toggle label="Published" description="Visible on the public site." checked={draft.published} onChange={(v) => set({ published: v })} />
          <Toggle label="Featured" description="Shown on the home page." checked={draft.featured} onChange={(v) => set({ featured: v })} />
        </Group>
        <Group title="Cover">
          <CoverFields cover={draft.cover} coverAlt={draft.coverAlt} set={set} errors={errors} />
        </Group>
      </div>
    </div>
  );
}

/* ---------- Team ---------- */

export function TeamForm({ draft, set, errors }: FormProps<TeamMember>) {
  return (
    <div className={twoCol}>
      <div className="flex min-w-0 flex-col gap-6">
        <Group title="Member">
          <TextField label="Name" value={draft.name} onChange={(v) => set({ name: v })} error={errors.name} required maxLength={120} />
          <Grid>
            <TextField label="Role" value={draft.role} onChange={(v) => set({ role: v })} error={errors.role} placeholder="e.g. President" maxLength={120} />
            <TextField
              label="Group"
              value={draft.group}
              onChange={(v) => set({ group: v })}
              error={errors.group}
              list="team-groups"
              hint="Members are grouped by this on the Team page."
              maxLength={60}
            />
          </Grid>
          <datalist id="team-groups">
            {["Faculty", "Leads", "Core", "Alumni"].map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <TextArea label="Bio" value={draft.bio} onChange={(v) => set({ bio: v })} error={errors.bio} rows={4} maxLength={1000} optional />
        </Group>
        <Group title="Profiles" description="Full URLs, e.g. https://linkedin.com/in/…">
          <TextField label="LinkedIn" value={draft.linkedin} onChange={(v) => set({ linkedin: v })} error={errors.linkedin} inputMode="url" optional />
          <TextField label="Instagram" value={draft.instagram} onChange={(v) => set({ instagram: v })} error={errors.instagram} inputMode="url" optional />
          <TextField label="GitHub" value={draft.github} onChange={(v) => set({ github: v })} error={errors.github} inputMode="url" optional />
        </Group>
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <Group title="Visibility">
          <Toggle label="Active" description="Show on the Team page." checked={draft.active} onChange={(v) => set({ active: v })} />
        </Group>
        <Group title="Photo">
          <ImagePicker label="Portrait" value={draft.photo} onChange={(v) => set({ photo: v })} error={errors.photo} round />
        </Group>
      </div>
    </div>
  );
}

/* ---------- Gallery ---------- */

export function EventSelect({
  value,
  onChange,
  error,
  label = "Event",
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  error?: string;
  label?: string;
}) {
  const { data, loading } = useAdminData<{ items: ClubEvent[] }>("/api/admin/events");
  const options = [
    { value: "", label: loading && !data ? "Loading events…" : "No event" },
    ...(data?.items ?? []).map((e) => ({ value: String(e.id), label: `${e.title} (${new Date(e.startsAt).toLocaleDateString()})` })),
  ];
  // Keep a dangling id selectable so it isn't silently dropped.
  if (value != null && data && !data.items.some((e) => e.id === value)) options.push({ value: String(value), label: `Event #${value} (missing)` });
  return (
    <SelectField
      label={label}
      value={value == null ? "" : String(value)}
      onChange={(v) => onChange(v ? Number(v) : null)}
      options={options}
      error={error}
      hint="Links the photo to an event page."
    />
  );
}

export function GalleryForm({ draft, set, errors }: FormProps<GalleryImage>) {
  return (
    <div className={twoCol}>
      <div className="flex min-w-0 flex-col gap-6">
        <Group title="Photo">
          <ImagePicker label="Image" value={draft.url} onChange={(v) => set({ url: v })} error={errors.url} aspect="4/3" />
          <TextField label="Caption" value={draft.caption} onChange={(v) => set({ caption: v })} error={errors.caption} optional maxLength={300} />
          <TextField
            label="Alt text"
            value={draft.alt}
            onChange={(v) => set({ alt: v })}
            error={errors.alt}
            hint="Describe what's in the photo for screen readers."
            maxLength={300}
          />
        </Group>
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <Group title="Placement">
          <Toggle label="Featured" description="Shown in the home page gallery." checked={draft.featured} onChange={(v) => set({ featured: v })} />
          <EventSelect value={draft.eventId} onChange={(v) => set({ eventId: v })} error={errors.eventId} />
        </Group>
      </div>
    </div>
  );
}

/* ---------- Posts ---------- */

export function PostForm({ draft, set, errors, isNew }: FormProps<Post>) {
  return (
    <div className={twoCol}>
      <div className="flex min-w-0 flex-col gap-6">
        <Group title="Post">
          <TitleSlug title={draft.title} slug={draft.slug} set={set} errors={errors} isNew={isNew} prefix="/blog/" />
          <TextArea
            label="Excerpt"
            value={draft.excerpt}
            onChange={(v) => set({ excerpt: v })}
            error={errors.excerpt}
            rows={3}
            maxLength={600}
            hint="Shown on the blog list and in link previews."
          />
        </Group>
        <Group title="Body">
          <MarkdownField label="Article" value={draft.body} onChange={(v) => set({ body: v })} error={errors.body} rows={20} />
        </Group>
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <Group title="Publishing">
          <Toggle label="Published" description="Visible on the public blog." checked={draft.published} onChange={(v) => set({ published: v })} />
          <DateTimeField label="Publish date" value={draft.publishedAt} onChange={(v) => v && set({ publishedAt: v })} error={errors.publishedAt} />
          <TextField label="Author" value={draft.author} onChange={(v) => set({ author: v })} error={errors.author} optional maxLength={120} />
        </Group>
        <Group title="Cover">
          <CoverFields cover={draft.cover} coverAlt={draft.coverAlt} set={set} errors={errors} />
        </Group>
      </div>
    </div>
  );
}

/* ---------- Alerts ---------- */

const toneOptions = [
  { value: "highlight" as const, label: "Highlight — violet (events, sign-ups)" },
  { value: "urgent" as const, label: "Urgent — red (deadlines, changes)" },
  { value: "info" as const, label: "Info — neutral" },
];

const stateCopy = {
  live: "Live now — this alert is eligible to show on the site.",
  scheduled: "Scheduled — it will go live at the start time.",
  expired: "Expired — the end time has passed.",
  off: "Off — turn on Active to show it.",
};

export function AlertForm({ draft, set, errors }: FormProps<Alert>) {
  const id = useId();
  const state = alertState(draft);
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby={`${id}-p`} className="rounded-2xl border border-line bg-elev p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id={`${id}-p`} className="text-[15px] font-semibold">
            Live preview
          </h2>
          <span className="text-[13px] text-dim">{stateCopy[state]}</span>
        </div>
        <AlertStrip message={draft.message} linkLabel={draft.linkLabel} linkUrl={draft.linkUrl} image={draft.image} tone={draft.tone} />
        <p className="mt-2 text-[13px] text-dim">
          This strip sits above the navigation on every page. If several alerts are live, the highest priority wins. With none live, the site shows a
          default “Join” strip while sign-ups are open.
        </p>
      </section>
      <div className={twoCol}>
        <div className="flex min-w-0 flex-col gap-6">
          <Group title="Message">
            <TextArea
              label="Text"
              value={draft.message}
              onChange={(v) => set({ message: v })}
              error={errors.message}
              rows={2}
              maxLength={400}
              placeholder="Robo Race 2026 registrations are open!"
            />
            <SelectField label="Tone" value={draft.tone} onChange={(v) => set({ tone: v })} options={toneOptions} error={errors.tone} />
          </Group>
          <Group title="Link" description="The whole strip is clickable.">
            <Grid>
              <TextField
                label="Link URL"
                value={draft.linkUrl}
                onChange={(v) => set({ linkUrl: v })}
                error={errors.linkUrl}
                placeholder="/events/robo-race or https://…"
                hint="Defaults to /events when empty."
                inputMode="url"
              />
              <TextField
                label="Link label"
                value={draft.linkLabel}
                onChange={(v) => set({ linkLabel: v })}
                error={errors.linkLabel}
                placeholder="Register now"
                hint="Defaults to “Learn more”."
                maxLength={60}
              />
            </Grid>
          </Group>
          <Group title="Image" description="A small round thumbnail at the left of the strip. Defaults to the club logo.">
            <ImagePicker label="Thumbnail" value={draft.image} onChange={(v) => set({ image: v })} error={errors.image} round />
          </Group>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Group title="Status">
            <Toggle label="Active" description="Master switch for this alert." checked={draft.active} onChange={(v) => set({ active: v })} />
            <NumberField
              label="Priority"
              value={draft.priority}
              onChange={(v) => set({ priority: v })}
              error={errors.priority}
              hint="Higher wins when more than one alert is live."
            />
          </Group>
          <Group title="Schedule" description="Leave empty to show immediately / indefinitely.">
            <DateTimeField label="Show from" value={draft.startsAt} onChange={(v) => set({ startsAt: v })} error={errors.startsAt} nullable />
            <DateTimeField label="Hide after" value={draft.endsAt} onChange={(v) => set({ endsAt: v })} error={errors.endsAt} nullable />
          </Group>
        </div>
      </div>
    </div>
  );
}

/* ---------- Partners ---------- */

export function PartnerForm({ draft, set, errors }: FormProps<Partner>) {
  return (
    <div className={twoCol}>
      <div className="flex min-w-0 flex-col gap-6">
        <Group title="Partner">
          <TextField label="Name" value={draft.name} onChange={(v) => set({ name: v })} error={errors.name} required maxLength={160} />
          <TextField
            label="Short name"
            value={draft.shortName}
            onChange={(v) => set({ shortName: v })}
            error={errors.shortName}
            placeholder="IEEE RAS"
            optional
            maxLength={60}
          />
          <TextArea
            label="Summary"
            value={draft.summary}
            onChange={(v) => set({ summary: v })}
            error={errors.summary}
            rows={3}
            maxLength={600}
            hint="Who they are, in one or two lines."
          />
          <TextArea
            label="How we work together"
            value={draft.body}
            onChange={(v) => set({ body: v })}
            error={errors.body}
            rows={5}
            maxLength={3000}
            optional
          />
        </Group>
        <Group title="Links" description="Full URLs. Leave empty to hide.">
          <TextField label="Website" value={draft.website} onChange={(v) => set({ website: v })} error={errors.website} inputMode="url" optional />
          <TextField label="Instagram" value={draft.instagram} onChange={(v) => set({ instagram: v })} error={errors.instagram} inputMode="url" optional />
          <TextField label="LinkedIn" value={draft.linkedin} onChange={(v) => set({ linkedin: v })} error={errors.linkedin} inputMode="url" optional />
        </Group>
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <Group title="Visibility">
          <Toggle label="Active" description="Show on the Collaborations page." checked={draft.active} onChange={(v) => set({ active: v })} />
          <Toggle
            label="On certificates"
            description="Print this logo and name on event certificates."
            checked={draft.onCertificate}
            onChange={(v) => set({ onCertificate: v })}
          />
        </Group>
        <Group title="Logo">
          <ImagePicker label="Logo" value={draft.logo} onChange={(v) => set({ logo: v })} error={errors.logo} aspect="1/1" hint="Square works best. Shown on a white tile." />
        </Group>
      </div>
    </div>
  );
}
