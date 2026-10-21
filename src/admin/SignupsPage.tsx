import { useMemo, useState } from "react";
import type { Signup } from "@shared/types";
import { fmtDate, fmtTime } from "@/lib/format";
import { Trash } from "@/components/icons";
import { adminApi, errorMessage } from "./adminApi";
import { useAdminData } from "./hooks";
import { toast } from "./toast";
import { ConfirmDialog, Empty, IconButton, LoadError, PageHeader, SkeletonRows } from "./ui";
import { countSince } from "./utils";

export default function SignupsPage() {
  const { data, error, loading, reload, mutate } = useAdminData<{ items: Signup[] }>("/api/admin/signups");
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<Signup | null>(null);
  const [busy, setBusy] = useState(false);
  const items = useMemo(() => data?.items ?? [], [data]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((i) => `${i.name} ${i.email} ${i.phone} ${i.course} ${i.interests}`.toLowerCase().includes(s));
  }, [items, q]);

  const recent = countSince(items, 7);

  const remove = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await adminApi.del(`/api/admin/signups/${target.id}`);
      mutate((d) => ({ items: d.items.filter((i) => i.id !== target.id) }));
      toast.success("Signup deleted");
      setTarget(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Signups"
        subtitle={data ? `${items.length} total · ${recent} in the last 7 days` : "People who joined through the website."}
        actions={
          <a href="/api/admin/signups.csv" className="btn btn-primary btn-sm" download>
            Export CSV
          </a>
        }
      />
      {items.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label htmlFor="signup-search" className="sr-only">
            Search signups
          </label>
          <input
            id="signup-search"
            type="search"
            className="field max-w-sm"
            placeholder="Search name, email, course…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <span className="text-[13px] text-dim" aria-live="polite">
              {filtered.length} match{filtered.length === 1 ? "" : "es"}
            </span>
          )}
        </div>
      )}

      {error && !data ? (
        <LoadError error={error} onRetry={reload} />
      ) : loading && !data ? (
        <SkeletonRows count={6} />
      ) : items.length === 0 ? (
        <Empty title="No signups yet" body="When someone fills in the Join form, they'll appear here." />
      ) : filtered.length === 0 ? (
        <Empty title="No matches" body={`Nothing matches “${q}”.`} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-line bg-elev md:block">
            <table className="w-full text-left text-[14px]">
              <caption className="sr-only">Signups</caption>
              <thead className="border-b border-line text-[12px] uppercase tracking-wide text-dim">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Name</th>
                  <th scope="col" className="px-4 py-3 font-medium">Contact</th>
                  <th scope="col" className="px-4 py-3 font-medium">Course</th>
                  <th scope="col" className="px-4 py-3 font-medium">Interests</th>
                  <th scope="col" className="px-4 py-3 font-medium">Date</th>
                  <th scope="col" className="px-2 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((s) => (
                  <tr key={s.id} className="align-top hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-fg">{s.name}</td>
                    <td className="px-4 py-3">
                      <a href={`mailto:${s.email}`} className="text-accent hover:underline">{s.email}</a>
                      {s.phone && <div className="text-muted">{s.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted">{s.course || "—"}</td>
                    <td className="max-w-[260px] px-4 py-3 text-muted"><p className="line-clamp-3 whitespace-pre-line">{s.interests || "—"}</p></td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {fmtDate(s.createdAt)}
                      <div className="text-[12px] text-dim">{fmtTime(s.createdAt)}</div>
                    </td>
                    <td className="px-2 py-2">
                      <IconButton label={`Delete signup from ${s.name}`} onClick={() => setTarget(s)} danger>
                        <Trash size={16} />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <ul className="flex flex-col gap-2 md:hidden">
            {filtered.map((s) => (
              <li key={s.id} className="flex gap-2 rounded-2xl border border-line bg-elev p-3.5">
                <div className="min-w-0 flex-1 text-[14px]">
                  <p className="font-medium text-fg">{s.name}</p>
                  <a href={`mailto:${s.email}`} className="block truncate text-accent">{s.email}</a>
                  <p className="text-muted">{[s.phone, s.course].filter(Boolean).join(" · ")}</p>
                  {s.interests && <p className="mt-1 line-clamp-2 text-dim">{s.interests}</p>}
                  <p className="mt-1 text-[12px] text-dim">{fmtDate(s.createdAt)} · {fmtTime(s.createdAt)}</p>
                </div>
                <IconButton label={`Delete signup from ${s.name}`} onClick={() => setTarget(s)} danger>
                  <Trash size={16} />
                </IconButton>
              </li>
            ))}
          </ul>
        </>
      )}
      <ConfirmDialog
        open={!!target}
        title="Delete this signup?"
        body={target ? <><strong className="text-fg">{target.name}</strong> ({target.email}) will be removed permanently.</> : null}
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
