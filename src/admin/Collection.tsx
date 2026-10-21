import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router";
import type { AdminTable, Editable } from "@shared/types";
import { cx } from "@/lib/format";
import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronUp, Grip, Plus } from "@/components/icons";
import { ApiError, adminApi, errorMessage, fieldErrors, tablePath } from "./adminApi";
import { useAdminData } from "./hooks";
import { toast } from "./toast";
import {
  ConfirmDialog,
  Empty,
  ErrorSummary,
  IconButton,
  LoadError,
  PageHeader,
  SaveBar,
  SkeletonRows,
  Toggle,
  UnsavedGuard,
} from "./ui";
import { SAVED_MESSAGE, stableJson, toDraft } from "./utils";

type Base = { id: number; createdAt: string; updatedAt: string };

export interface FormProps<T> {
  draft: Editable<T>;
  set: (patch: Partial<Editable<T>>) => void;
  errors: Record<string, string>;
  isNew: boolean;
}

export interface CollectionConfig<T extends Base> {
  table: AdminTable;
  base: string; // "/admin/events"
  title: string;
  singular: string;
  subtitle?: ReactNode;
  sortable?: boolean;
  blank: () => Editable<T>;
  label: (d: Editable<T>) => string;
  meta?: (item: T) => ReactNode;
  thumb?: (item: T) => string;
  roundThumb?: boolean;
  badges?: (item: T) => ReactNode;
  search: (item: T) => string;
  quickToggle?: { key: keyof Editable<T> & string; label: string };
  validate?: (d: Editable<T>) => Record<string, string>;
  viewUrl?: (d: Editable<T>) => string | null;
  Form: ComponentType<FormProps<T>>;
  ListTop?: ComponentType<{ items: T[]; reload: () => void }>;
  emptyBody?: ReactNode;
}




export function Collection<T extends Base>({ config }: { config: CollectionConfig<T> }) {
  return (
    <Routes>
      <Route index element={<CollectionList config={config} />} />
      <Route path="new" element={<CollectionEditor key="new" config={config} />} />
      <Route path=":id" element={<EditorById config={config} />} />
    </Routes>
  );
}

/* ---------------- List ---------------- */

function CollectionList<T extends Base>({ config }: { config: CollectionConfig<T> }) {
  const { data, error, loading, reload, mutate } = useAdminData<{ items: T[] }>(tablePath(config.table));
  const [q, setQ] = useState("");
  const [dragId, setDragId] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const items = useMemo(() => data?.items ?? [], [data]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((i) => config.search(i).toLowerCase().includes(s)) : items;
  }, [items, q, config]);
  const canReorder = !!config.sortable && !q.trim() && items.length > 1;

  const persistOrder = async (next: T[]) => {
    mutate((d) => ({ ...d, items: next }));
    try {
      await adminApi.post(`/api/admin/reorder/${config.table}`, { ids: next.map((i) => i.id) });
      toast.success("Order saved — live on the site within ~30 seconds");
    } catch (err) {
      toast.error(`Couldn't save the new order: ${errorMessage(err)}`);
      reload();
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = items.slice();
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    void persistOrder(next);
  };

  const quickToggle = async (item: T, value: boolean) => {
    const key = config.quickToggle!.key;
    mutate((d) => ({ ...d, items: d.items.map((i) => (i.id === item.id ? { ...i, [key]: value } : i)) }));
    try {
      const res = await adminApi.put<{ item: T }>(tablePath(config.table, item.id), { [key]: value });
      mutate((d) => ({ ...d, items: d.items.map((i) => (i.id === item.id ? res.item : i)) }));
      toast.success(SAVED_MESSAGE);
    } catch (err) {
      toast.error(errorMessage(err));
      reload();
    }
  };

  return (
    <div>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        actions={
          <Link to={`${config.base}/new`} className="btn btn-primary btn-sm">
            <Plus size={16} /> New {config.singular}
          </Link>
        }
      />
      {config.ListTop && data && <config.ListTop items={items} reload={reload} />}

      {items.length > 3 && (
        <div className="mb-4">
          <label htmlFor="list-search" className="sr-only">
            Search {config.title.toLowerCase()}
          </label>
          <input
            id="list-search"
            type="search"
            className="field max-w-sm"
            placeholder={`Search ${config.title.toLowerCase()}…`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      )}

      {error && !data ? (
        <LoadError error={error} onRetry={reload} />
      ) : loading && !data ? (
        <SkeletonRows />
      ) : items.length === 0 ? (
        <Empty
          title={`No ${config.title.toLowerCase()} yet`}
          body={config.emptyBody}
          action={
            <Link to={`${config.base}/new`} className="btn btn-primary btn-sm">
              <Plus size={16} /> New {config.singular}
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <Empty title="No matches" body={`Nothing matches “${q}”.`} />
      ) : (
        <>
          {config.sortable && (
            <p className="mb-2 px-1 text-[13px] text-dim">
              {canReorder ? "Drag the handle or use the arrows to change the order shown on the site." : q ? "Clear the search to reorder." : null}
            </p>
          )}
          <ul className="flex flex-col gap-2" aria-label={config.title}>
            {filtered.map((item, i) => {
              const thumb = config.thumb?.(item);
              const title = config.label(toDraft(item)) || "(untitled)";
              return (
                <li
                  key={item.id}
                  draggable={canReorder}
                  onDragStart={(e) => {
                    setDragId(item.id);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(item.id));
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverIndex(null);
                  }}
                  onDragOver={(e) => {
                    if (dragId == null) return;
                    e.preventDefault();
                    setOverIndex(i);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = items.findIndex((x) => x.id === dragId);
                    setDragId(null);
                    setOverIndex(null);
                    if (from >= 0) move(from, i);
                  }}
                  className={cx(
                    "relative flex items-center gap-3 rounded-2xl border bg-elev p-2.5 pr-3 transition-colors sm:gap-4",
                    dragId === item.id ? "opacity-40" : "",
                    overIndex === i && dragId !== item.id ? "border-accent" : "border-line hover:border-line-strong",
                  )}
                >
                  {canReorder && (
                    <span className="hidden cursor-grab text-dim active:cursor-grabbing sm:block" aria-hidden="true" title="Drag to reorder">
                      <Grip size={18} />
                    </span>
                  )}
                  {config.thumb && (
                    <div className={cx("h-12 w-12 shrink-0 overflow-hidden bg-ink sm:h-14 sm:w-14", config.roundThumb ? "rounded-full" : "rounded-lg")}>
                      {thumb ? <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`${config.base}/${item.id}`}
                      className="block truncate text-[15px] font-medium text-fg after:absolute after:inset-0 after:rounded-2xl after:content-[''] hover:text-accent"
                    >
                      {title}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-dim">
                      {config.badges?.(item)}
                      {config.meta?.(item)}
                    </div>
                  </div>
                  <div className="relative z-10 flex shrink-0 items-center gap-1">
                    {config.quickToggle && (
                      <Toggle
                        compact
                        label={`${config.quickToggle.label}: ${title}`}
                        checked={!!(item as unknown as Record<string, unknown>)[config.quickToggle.key]}
                        onChange={(v) => void quickToggle(item, v)}
                      />
                    )}
                    {canReorder && (
                      <div className="ml-1 flex flex-col">
                        <IconButton label={`Move ${title} up`} onClick={() => move(i, i - 1)} disabled={i === 0} className="h-7 w-8">
                          <ChevronUp size={15} />
                        </IconButton>
                        <IconButton label={`Move ${title} down`} onClick={() => move(i, i + 1)} disabled={i === items.length - 1} className="h-7 w-8">
                          <ChevronDown size={15} />
                        </IconButton>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

/* ---------------- Editor ---------------- */

function EditorById<T extends Base>({ config }: { config: CollectionConfig<T> }) {
  const { id } = useParams();
  const { data, error, loading, reload } = useAdminData<{ items: T[] }>(tablePath(config.table));
  const item = data?.items.find((i) => String(i.id) === id);
  if (error && !data) return <LoadError error={error} onRetry={reload} />;
  if (loading && !data)
    return (
      <div aria-busy="true" className="space-y-4">
        <div className="skeleton h-9 w-64" />
        <div className="skeleton h-64 w-full" />
        <div className="skeleton h-40 w-full" />
      </div>
    );
  if (!item)
    return (
      <Empty
        title={`${config.singular[0].toUpperCase()}${config.singular.slice(1)} not found`}
        body="It may have been deleted."
        action={
          <Link to={config.base} className="btn btn-ghost btn-sm">
            Back to {config.title.toLowerCase()}
          </Link>
        }
      />
    );
  return <CollectionEditor key={item.id} config={config} item={item} />;
}

function CollectionEditor<T extends Base>({ config, item }: { config: CollectionConfig<T>; item?: T }) {
  const navigate = useNavigate();
  const isNew = !item;
  const [current, setCurrent] = useState<T | undefined>(item);
  const [baseline, setBaseline] = useState<Editable<T>>(() => (item ? toDraft(item) : config.blank()));
  const [draft, setDraft] = useState<Editable<T>>(baseline);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const dirty = stableJson(draft) !== stableJson(baseline);

  const set = (patch: Partial<Editable<T>>) => {
    setDraft((d) => ({ ...d, ...patch }));
    const keys = Object.keys(patch);
    setErrors((e) => {
      if (!keys.some((k) => Object.keys(e).some((ek) => ek === k || ek.startsWith(`${k}.`)))) return e;
      return Object.fromEntries(Object.entries(e).filter(([ek]) => !keys.some((k) => ek === k || ek.startsWith(`${k}.`))));
    });
  };

  const save = async () => {
    if (saving) return;
    const local = config.validate?.(draft) ?? {};
    if (Object.keys(local).length) {
      setErrors(local);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const res = isNew
        ? await adminApi.post<{ item: T }>(tablePath(config.table), draft)
        : await adminApi.put<{ item: T }>(tablePath(config.table, current!.id), draft);
      const saved = toDraft(res.item);
      setCurrent(res.item);
      setBaseline(saved);
      setDraft(saved);
      toast.success(isNew ? `${config.singular[0].toUpperCase()}${config.singular.slice(1)} created. ${SAVED_MESSAGE}` : SAVED_MESSAGE);
      if (isNew) navigate(`${config.base}/${res.item.id}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ slug: err.message || "That slug is already in use" });
        toast.error("That slug is already in use — pick another.");
      } else if (err instanceof ApiError && err.status === 400) {
        const fe = fieldErrors(err);
        setErrors(Object.keys(fe).length ? fe : { "": err.message });
        toast.error("Please fix the highlighted fields.");
      } else if (!(err instanceof ApiError && err.status === 401)) {
        toast.error(errorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  // ⌘S / Ctrl+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        document.getElementById("admin-save")?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const remove = async () => {
    if (!current) return;
    setDeleting(true);
    try {
      await adminApi.del(tablePath(config.table, current.id));
      toast.success(`Deleted. Removed from the site within ~30 seconds.`);
      setLeaving(true);
      setConfirmDelete(false);
      navigate(config.base);
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(false);
    }
  };

  const label = config.label(draft);
  const viewUrl = !isNew ? config.viewUrl?.(baseline) : null;
  const Form = config.Form;

  return (
    <div>
      <UnsavedGuard when={dirty && !leaving} />
      <PageHeader
        back={
          <Link to={config.base} className="mb-2 inline-flex items-center gap-1 text-[14px] text-accent hover:underline">
            <ChevronLeft size={16} /> {config.title}
          </Link>
        }
        title={isNew ? `New ${config.singular}` : label || `Edit ${config.singular}`}
        actions={
          <>
            {viewUrl && (
              <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                View on site <ArrowUpRight size={15} />
              </a>
            )}
            {!isNew && (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            )}
          </>
        }
      />
      <div className="mb-5">
        <ErrorSummary errors={errors} />
      </div>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Form draft={draft} set={set} errors={errors} isNew={isNew} />
        <SaveBar
          dirty={isNew || dirty}
          saving={saving}
          onSave={() => void save()}
          onDiscard={dirty ? () => setDraft(baseline) : undefined}
          label={isNew ? `Create ${config.singular}` : "Save changes"}
          alwaysShow
        />
        <button id="admin-save" type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      </form>
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete this ${config.singular}?`}
        body={
          <>
            <strong className="text-fg">{label || "This item"}</strong> will be removed from the site. This can't be undone.
          </>
        }
        busy={deleting}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
