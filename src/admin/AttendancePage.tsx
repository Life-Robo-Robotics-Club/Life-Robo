import { useEffect, useMemo, useRef, useState, type FormEvent, type SVGProps } from "react";
import { Link, Route, Routes, useParams } from "react-router";
import type { AttendanceEvent, CertificateSendResult, MailStatus, Registration } from "@shared/types";
import { cx, fmtDate, fmtTime } from "@/lib/format";
import { Check, ChevronLeft, ChevronRight, Mail, Plus, Refresh, Trash } from "@/components/icons";
import { adminApi, errorMessage, fieldErrors } from "./adminApi";
import { useAdminData } from "./hooks";
import { toast } from "./toast";
import { Badge, ConfirmDialog, Empty, Grid, Group, IconButton, LoadError, PageHeader, SkeletonRows, Spinner, TextField } from "./ui";

const BASE = "/admin/attendance";
const BATCH_MAX = 50;

export default function AttendancePage() {
  return (
    <Routes>
      <Route index element={<EventList />} />
      <Route path=":eventId" element={<EventAttendance />} />
    </Routes>
  );
}

/* ---------- Shared bits ---------- */

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const certUrl = (code: string) => `${location.origin}/certificates/${code}`;

function LinkIcon({ size = 20, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function MailNotice() {
  return (
    <div role="note" className="mb-5 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-[14px] text-fg/90">
      Email isn't set up yet. Attendance still works; certificates can be shared by link. See{" "}
      <code className="font-mono text-[13px]">scripts/gmail-mailer.gs</code> for setup.
    </div>
  );
}

/* ---------- Event list ---------- */

function EventList() {
  const { data, error, loading, reload } = useAdminData<{ items: AttendanceEvent[]; mail: MailStatus }>("/api/admin/attendance");

  const items = useMemo(() => {
    const list = data?.items ?? [];
    const t = (e: AttendanceEvent) => Date.parse(e.startsAt);
    const upcoming = list.filter((e) => e.status === "upcoming").sort((a, b) => t(a) - t(b));
    const past = list.filter((e) => e.status !== "upcoming").sort((a, b) => t(b) - t(a));
    return [...upcoming, ...past];
  }, [data]);

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Pick an event to check people in, add walk-ins and send certificates." />
      {data && !data.mail.configured && <MailNotice />}
      {error && !data ? (
        <LoadError error={error} onRetry={reload} />
      ) : loading && !data ? (
        <SkeletonRows count={5} />
      ) : items.length === 0 ? (
        <Empty
          title="No events yet"
          body="Create an event first. Its attendance list will show up here."
          action={
            <Link to="/admin/events/new" className="btn btn-primary btn-sm">
              <Plus size={16} /> New event
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((e) => (
            <li key={e.id}>
              <Link
                to={`${BASE}/${e.id}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-elev p-4 transition-colors hover:bg-white/[0.04]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-fg">{e.title}</p>
                    {e.status === "upcoming" ? <Badge tone="blue">Upcoming</Badge> : <Badge>Past</Badge>}
                    {e.registrationOpen && <Badge tone="green">Registration on</Badge>}
                  </div>
                  <p className="mt-0.5 text-[14px] text-muted">
                    {fmtDate(e.startsAt)} · {fmtTime(e.startsAt)}
                  </p>
                  <p className="mt-1 text-[13px] text-dim">
                    {e.registered} registered · {e.present} present · {plural(e.certificatesSent, "certificate")} sent
                  </p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-dim" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Event attendance ---------- */

type Data = { event: AttendanceEvent; items: Registration[]; mail: MailStatus };
type Filter = "all" | "present" | "absent" | "walkin";

const byName = (a: Registration, b: Registration) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

const blankWalkIn = { name: "", email: "", phone: "", course: "" };

function sendSummary(r: CertificateSendResult) {
  const parts: string[] = [];
  if (r.sent) parts.push(`Sent ${plural(r.sent, "certificate")}.`);
  if (r.failed) parts.push(`${r.failed} failed${r.error ? `: ${r.error}` : ""}.`);
  if (!r.sent && !r.failed) parts.push("Nothing to send.");
  if (r.remaining) parts.push(`${r.remaining} left, click again to send the rest.`);
  return parts.join(" ");
}

function EventAttendance() {
  const { eventId } = useParams();
  const path = `/api/admin/attendance/${eventId}`;
  const { data, error, loading, reload, mutate } = useAdminData<Data>(path);
  const items = useMemo(() => data?.items ?? [], [data]);
  const configured = !!data?.mail.configured;

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, setPending] = useState<Set<number>>(() => new Set());
  const [target, setTarget] = useState<Registration | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [quota, setQuota] = useState<number | null>(null);

  // Gmail quota is slow to ask for, so fetch it once the page knows email is set up.
  useEffect(() => {
    if (!configured) return;
    let live = true;
    adminApi
      .get<{ configured: boolean; quota: number | null }>("/api/admin/mail-quota")
      .then((r) => {
        if (live) setQuota(r.quota);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [configured, eventId]);

  const stats = useMemo(() => {
    const present = items.filter((i) => i.attended).length;
    const walkIns = items.filter((i) => i.source === "walk_in").length;
    const sent = items.filter((i) => i.certificateSentAt).length;
    const toSend = items.filter((i) => i.attended && i.email && !i.certificateSentAt).length;
    return { registered: items.length, present, walkIns, sent, toSend, absent: items.length - present };
  }, [items]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((i) => {
      if (filter === "present" && !i.attended) return false;
      if (filter === "absent" && i.attended) return false;
      if (filter === "walkin" && i.source !== "walk_in") return false;
      return !s || `${i.name} ${i.email} ${i.phone} ${i.code}`.toLowerCase().includes(s);
    });
  }, [items, q, filter]);

  const setBusy = (id: number, on: boolean) =>
    setPending((p) => {
      const next = new Set(p);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const replace = (item: Registration) =>
    mutate((d) => ({ ...d, items: d.items.map((i) => (i.id === item.id ? item : i)) }));

  const upsert = (item: Registration) =>
    mutate((d) => {
      const exists = d.items.some((i) => i.id === item.id);
      const next = exists ? d.items.map((i) => (i.id === item.id ? item : i)) : [...d.items, item];
      return { ...d, items: next.sort(byName) };
    });

  const toggle = async (r: Registration) => {
    const value = !r.attended;
    replace({ ...r, attended: value });
    setBusy(r.id, true);
    try {
      const res = await adminApi.put<{ item: Registration }>(`/api/admin/registrations/${r.id}`, { attended: value });
      replace(res.item);
    } catch (err) {
      replace(r);
      toast.error(`Couldn't update ${r.name}. ${errorMessage(err)}`);
    } finally {
      setBusy(r.id, false);
    }
  };

  const copyLink = async (r: Registration) => {
    const url = certUrl(r.code);
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Certificate link for ${r.name} copied`);
    } catch {
      toast.info(`Certificate link: ${url}`);
    }
  };

  const sendOne = async (r: Registration) => {
    setBusy(r.id, true);
    try {
      const res = await adminApi.post<CertificateSendResult>(`${path}/certificates`, { ids: [r.id], resend: true });
      if (res.quota != null) setQuota(res.quota);
      if (res.sent) toast.success(`Certificate sent to ${r.email}`);
      else toast.error(res.error || `Couldn't send the certificate to ${r.name}.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(r.id, false);
      reload();
    }
  };

  const resendConfirmation = async (r: Registration) => {
    setBusy(r.id, true);
    try {
      const res = await adminApi.post<{ item: Registration }>(`/api/admin/registrations/${r.id}/confirmation`);
      replace(res.item);
      toast.success(`Confirmation sent to ${r.email}`);
    } catch (err) {
      toast.error(errorMessage(err));
      reload();
    } finally {
      setBusy(r.id, false);
    }
  };

  const remove = async () => {
    if (!target) return;
    setDeleting(true);
    try {
      await adminApi.del(`/api/admin/registrations/${target.id}`);
      mutate((d) => ({ ...d, items: d.items.filter((i) => i.id !== target.id) }));
      toast.success(`${target.name} removed`);
      setTarget(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const sendAll = async () => {
    setSending(true);
    try {
      const res = await adminApi.post<CertificateSendResult>(`${path}/certificates`, {});
      if (res.quota != null) setQuota(res.quota);
      if (res.sent) toast.success(sendSummary(res));
      else toast.error(sendSummary(res));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
      setConfirmSend(false);
      reload();
    }
  };

  const back = (
    <Link to={BASE} className="mb-2 inline-flex items-center gap-1 text-[14px] text-accent hover:underline">
      <ChevronLeft size={16} /> Attendance
    </Link>
  );

  if (error && !data) {
    return (
      <div>
        <PageHeader back={back} title="Attendance" />
        <LoadError error={error} onRetry={reload} />
      </div>
    );
  }
  if (loading && !data) {
    return (
      <div>
        <PageHeader back={back} title="Attendance" />
        <SkeletonRows count={6} />
      </div>
    );
  }
  if (!data) return null;

  const ev = data.event;
  const batch = Math.min(stats.toSend, BATCH_MAX);
  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.registered },
    { key: "present", label: "Present", count: stats.present },
    { key: "absent", label: "Not yet", count: stats.absent },
    { key: "walkin", label: "Walk-ins", count: stats.walkIns },
  ];

  const rowActions = (r: Registration) => {
    const busy = pending.has(r.id);
    return (
      <>
        {r.attended && (
          <IconButton label={`Copy certificate link for ${r.name}`} onClick={() => void copyLink(r)}>
            <LinkIcon size={16} />
          </IconButton>
        )}
        {r.attended && r.email && (
          <IconButton
            label={configured ? `Email certificate to ${r.name}` : "Email isn't set up yet"}
            onClick={() => void sendOne(r)}
            disabled={!configured || busy}
          >
            <Mail size={16} />
          </IconButton>
        )}
        {r.email && (
          <IconButton
            label={configured ? `Resend confirmation to ${r.name}` : "Email isn't set up yet"}
            onClick={() => void resendConfirmation(r)}
            disabled={!configured || busy}
          >
            <Refresh size={16} />
          </IconButton>
        )}
        <IconButton label={`Remove ${r.name}`} onClick={() => setTarget(r)} danger disabled={busy}>
          <Trash size={16} />
        </IconButton>
      </>
    );
  };

  const statusBadges = (r: Registration) => (
    <>
      {r.source === "walk_in" && <Badge tone="amber">Walk-in</Badge>}
      {r.certificateSentAt && <Badge tone="green">Certificate sent</Badge>}
      {r.emailError && (
        <span title={r.emailError}>
          <Badge tone="red">Email failed</Badge>
        </span>
      )}
      {r.confirmationSentAt && !r.certificateSentAt && <Badge tone="blue">Confirmation sent</Badge>}
    </>
  );

  const checkIn = (r: Registration, wide?: boolean) => (
    <button
      type="button"
      aria-pressed={r.attended}
      onClick={() => void toggle(r)}
      disabled={pending.has(r.id)}
      className={cx(
        "inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-[15px] font-medium transition-colors disabled:opacity-70",
        wide && "min-w-[148px]",
        r.attended ? "bg-success text-black hover:bg-success/85" : "border border-line-strong text-fg hover:bg-white/10",
      )}
    >
      {r.attended ? (
        <>
          <Check size={16} strokeWidth={2.6} /> Present
        </>
      ) : (
        "Mark present"
      )}
      <span className="sr-only">: {r.name}</span>
    </button>
  );

  return (
    <div>
      <PageHeader
        back={back}
        title={ev.title}
        subtitle={
          <>
            {fmtDate(ev.startsAt)} · {fmtTime(ev.startsAt)} · {stats.registered} registered · {stats.present} present
          </>
        }
        actions={
          <>
            <a href={`${path}/export.csv`} className="btn btn-ghost btn-sm" download>
              Export CSV
            </a>
            <button
              type="button"
              className="btn btn-primary btn-sm disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setConfirmSend(true)}
              disabled={!configured || stats.toSend === 0 || sending}
            >
              {sending ? <Spinner size={14} /> : <Mail size={16} />}
              Send certificates ({stats.toSend})
            </button>
          </>
        }
      />

      {!configured && <MailNotice />}
      {configured && quota != null && (
        <p className="-mt-3 mb-5 text-[13px] text-dim">{plural(quota, "email")} left today</p>
      )}

      <dl className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4" aria-live="polite">
        {[
          { label: "Registered", value: stats.registered },
          { label: "Present", value: stats.present },
          { label: "Walk-ins", value: stats.walkIns },
          { label: "Certificates sent", value: stats.sent },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-elev px-4 py-3">
            <dt className="text-[13px] text-dim">{s.label}</dt>
            <dd className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-fg">{s.value}</dd>
          </div>
        ))}
      </dl>

      <WalkInForm path={path} onAdded={upsert} className="mb-6" />

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="attendance-search" className="sr-only">
            Search people
          </label>
          <input
            id="attendance-search"
            type="search"
            className="field max-w-sm text-[16px]"
            placeholder="Search name, email, phone or ID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {(q || filter !== "all") && (
            <span className="text-[13px] text-dim" aria-live="polite">
              {plural(filtered.length, "person", "people")}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter people">
          {filters.map((f) => (
            <button key={f.key} type="button" className="chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label} · {f.count}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <Empty title="No one on the list yet" body="People who register online show up here. Add walk-ins with the form above." />
      ) : filtered.length === 0 ? (
        <Empty title="No matches" body={q ? `Nothing matches “${q}”.` : "No one in this view."} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-line bg-elev md:block">
            <table className="w-full text-left text-[14px]">
              <caption className="sr-only">Attendance for {ev.title}</caption>
              <thead className="border-b border-line text-[12px] uppercase tracking-wide text-dim">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Check-in</th>
                  <th scope="col" className="px-4 py-3 font-medium">Name</th>
                  <th scope="col" className="px-4 py-3 font-medium">Contact</th>
                  <th scope="col" className="px-4 py-3 font-medium">Year / branch</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-2 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((r) => (
                  <tr key={r.id} className="align-middle hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5">{checkIn(r, true)}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-fg">{r.name}</p>
                      <p className="font-mono text-[12px] text-dim">{r.code}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      {r.email ? (
                        <a href={`mailto:${r.email}`} className="text-accent hover:underline">{r.email}</a>
                      ) : (
                        <span className="text-dim">No email</span>
                      )}
                      {r.phone && <div className="text-muted">{r.phone}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{r.course}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1.5">{statusBadges(r)}</div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex justify-end gap-0.5">{rowActions(r)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <ul className="flex flex-col gap-2 md:hidden">
            {filtered.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line bg-elev p-3.5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1 text-[14px]">
                    <p className="text-[16px] font-medium text-fg">{r.name}</p>
                    {r.email && <p className="truncate text-muted">{r.email}</p>}
                    {(r.phone || r.course) && <p className="text-muted">{[r.phone, r.course].filter(Boolean).join(" · ")}</p>}
                  </div>
                  {checkIn(r)}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap gap-1.5">{statusBadges(r)}</div>
                  <div className="flex shrink-0 gap-0.5">{rowActions(r)}</div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={!!target}
        title="Remove this person?"
        body={
          target ? (
            <>
              <strong className="text-fg">{target.name}</strong>
              {target.email ? ` (${target.email})` : ""} will be removed from this event. Their certificate link will stop working.
            </>
          ) : null
        }
        confirmLabel="Remove"
        busy={deleting}
        onConfirm={() => void remove()}
        onCancel={() => setTarget(null)}
      />
      <ConfirmDialog
        open={confirmSend}
        title={`Send ${plural(batch, "certificate")}?`}
        body={
          <>
            <p>
              This emails a certificate to {plural(batch, "person", "people")} who were present and haven't had one yet.
              {stats.toSend > BATCH_MAX && ` Up to ${BATCH_MAX} go out per click, so ${stats.toSend - BATCH_MAX} will be left for the next click.`}
            </p>
            <p className="mt-2">
              Emails go from the club Gmail, which can send about 100 a day.
              {quota != null && ` ${plural(quota, "email")} left today.`}
            </p>
          </>
        }
        confirmLabel="Send"
        danger={false}
        busy={sending}
        onConfirm={() => void sendAll()}
        onCancel={() => setConfirmSend(false)}
      />
    </div>
  );
}

/* ---------- Walk-in form ---------- */

function WalkInForm({
  path,
  onAdded,
  className,
}: {
  path: string;
  onAdded: (item: Registration) => void;
  className?: string;
}) {
  const [form, setForm] = useState(blankWalkIn);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const wrap = useRef<HTMLFormElement>(null);

  const set = (key: keyof typeof blankWalkIn) => (v: string) => {
    setForm((f) => ({ ...f, [key]: v }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  const focusName = () => wrap.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.name.trim()) {
      setErrors({ name: "Enter a name" });
      focusName();
      return;
    }
    setSaving(true);
    try {
      const res = await adminApi.post<{ item: Registration; existing: boolean }>(path, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        course: form.course.trim(),
        attended: true,
      });
      onAdded(res.item);
      if (res.existing) toast.info(`${res.item.name} was already registered, marked present`);
      else toast.success(`${res.item.name} added and marked present`);
      setForm(blankWalkIn);
      setErrors({});
    } catch (err) {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe);
      else toast.error(errorMessage(err));
    } finally {
      setSaving(false);
      focusName();
    }
  };

  return (
    <form ref={wrap} noValidate onSubmit={(e) => void submit(e)} className={className}>
      <Group title="Add walk-in" description="For people who show up without registering. They're marked present right away.">
        <Grid>
          <TextField
            label="Name"
            name="name"
            value={form.name}
            onChange={set("name")}
            error={errors.name || undefined}
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="next"
            className="text-[16px]"
            required
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            inputMode="email"
            value={form.email}
            onChange={set("email")}
            error={errors.email || undefined}
            hint="Needed to email the certificate"
            autoComplete="off"
            autoCapitalize="none"
            className="text-[16px]"
            optional
          />
          <TextField
            label="Phone"
            name="phone"
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={set("phone")}
            error={errors.phone || undefined}
            autoComplete="off"
            className="text-[16px]"
            optional
          />
          <TextField
            label="Year / branch"
            name="course"
            value={form.course}
            onChange={set("course")}
            error={errors.course || undefined}
            autoComplete="off"
            className="text-[16px]"
            optional
          />
        </Grid>
        <div>
          <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={saving}>
            {saving ? <Spinner size={14} /> : <Plus size={16} />}
            Add and mark present
          </button>
        </div>
      </Group>
    </form>
  );
}
