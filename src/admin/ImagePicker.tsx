import { useId, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/format";
import { Close, Plus, Upload } from "@/components/icons";
import { IMAGE_ACCEPT, UPLOAD_HINT, checkImage, errorMessage, fmtBytes, sizeLabel, uploadImage, type MediaItem } from "./adminApi";
import { useAdminData } from "./hooks";
import { toast } from "./toast";
import { Empty, IconButton, LoadError, Modal, Spinner } from "./ui";

const isUrlish = (v: string) => v === "" || v.startsWith("/") || /^https?:\/\//i.test(v);

/** Uploads one file with progress state; returns the URL or null. Progress -1 = compressing. */
function useUploader() {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const upload = async (file: File): Promise<string | null> => {
    const bad = checkImage(file);
    if (bad) {
      setError(bad);
      return null;
    }
    setError(null);
    setInfo(null);
    setProgress(-1);
    try {
      const res = await uploadImage(file, setProgress, () => setProgress(0));
      setInfo(`Uploaded · ${sizeLabel(res)}`);
      toast.success(`Image uploaded (${sizeLabel(res)})`);
      return res.url;
    } catch (err) {
      setError(errorMessage(err));
      return null;
    } finally {
      setProgress(null);
    }
  };
  return { progress, error, setError, info, setInfo, upload };
}

function ProgressBar({ value }: { value: number }) {
  if (value < 0)
    return (
      <p className="flex items-center gap-2 text-[13px] text-muted" role="status">
        <Spinner size={14} /> Compressing…
      </p>
    );
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 text-[13px] text-muted">
      <Spinner size={14} />
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
        <div className="h-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right tabular-nums">{pct}%</span>
    </div>
  );
}

export function ImagePicker({
  label,
  value,
  onChange,
  error,
  hint,
  aspect = "16/9",
  round,
}: {
  label: ReactNode;
  value: string;
  onChange: (url: string) => void;
  error?: string;
  hint?: ReactNode;
  aspect?: string;
  round?: boolean;
}) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [broken, setBroken] = useState<string | null>(null);
  const { progress, error: upErr, setError, info, setInfo, upload } = useUploader();
  const urlInvalid = !isUrlish(value.trim());
  const shownError = error || upErr || (urlInvalid ? "Must be a /path or an http(s) URL" : undefined);

  const onFile = async (file?: File) => {
    if (!file) return;
    const url = await upload(file);
    if (url) onChange(url);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="min-w-0">
      <label htmlFor={`${id}-url`} className="label">
        {label}
      </label>
      <div
        className="flex flex-col gap-3 sm:flex-row"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) e.preventDefault();
        }}
        onDrop={(e) => {
          const f = e.dataTransfer.files?.[0];
          if (f) {
            e.preventDefault();
            void onFile(f);
          }
        }}
      >
        <div
          className={cx(
            "relative shrink-0 overflow-hidden border border-line-strong bg-ink",
            round ? "h-28 w-28 rounded-full" : "w-full rounded-xl sm:w-48",
          )}
          style={round ? undefined : { aspectRatio: aspect }}
        >
          {value && broken !== value ? (
            <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setBroken(value)} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-[12px] text-dim">
              {value ? "Preview unavailable" : "No image"}
            </div>
          )}
          {progress !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Spinner size={22} />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={progress !== null}>
              <Upload size={16} /> Upload
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLibraryOpen(true)}>
              Choose from library
            </button>
            {value && (
              <button type="button" className="btn btn-sm text-muted hover:text-fg" onClick={() => onChange("")}>
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <input
            id={`${id}-url`}
            className={cx("field text-[14px]", shownError && "border-danger")}
            value={value}
            placeholder="/photos/… or https://…"
            onChange={(e) => {
              setError(null);
              setInfo(null);
              onChange(e.target.value);
            }}
            aria-invalid={shownError ? true : undefined}
            aria-describedby={`${id}-msg`}
          />
          {progress !== null && <ProgressBar value={progress} />}
          <p id={`${id}-msg`} className={cx("text-[13px]", shownError ? "text-danger" : "text-dim")} role={shownError ? "alert" : undefined}>
            {shownError || info || hint || `Upload, pick from the library, paste a URL or drop an image here. ${UPLOAD_HINT}`}
          </p>
        </div>
      </div>
      <MediaModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={(url) => {
          onChange(url);
          setLibraryOpen(false);
        }}
      />
    </div>
  );
}

/** Ordered list of images (events.images). */
export function MultiImageField({
  label,
  value,
  onChange,
  error,
  max = 60,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
  max?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [busy, setBusy] = useState<{ done: number; total: number; progress: number } | null>(null);
  const [sizes, setSizes] = useState<string[]>([]);
  const [errs, setErrs] = useState<string[]>([]);
  const [pasted, setPasted] = useState("");
  const pasteId = useId();

  const addPasted = () => {
    const v = pasted.trim();
    if (!v || !isUrlish(v)) return;
    onChange([...value, v]);
    setPasted("");
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, max - value.length);
    const problems: string[] = [];
    const done: string[] = [];
    let next = value;
    setBusy({ done: 0, total: list.length, progress: -1 });
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const bad = checkImage(f);
      if (bad) {
        problems.push(bad);
        continue;
      }
      try {
        setBusy({ done: i, total: list.length, progress: -1 });
        const res = await uploadImage(
          f,
          (p) => setBusy({ done: i, total: list.length, progress: p }),
          () => setBusy({ done: i, total: list.length, progress: 0 }),
        );
        done.push(`${f.name}: ${sizeLabel(res)}`);
        next = [...next, res.url];
        onChange(next);
      } catch (err) {
        problems.push(`${f.name}: ${errorMessage(err)}`);
      }
    }
    setBusy(null);
    setErrs(problems);
    setSizes(done);
    if (fileRef.current) fileRef.current.value = "";
    if (next.length > value.length) toast.success(`${next.length - value.length} image${next.length - value.length === 1 ? "" : "s"} added`);
  };

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const n = value.slice();
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };

  return (
    <div className="min-w-0">
      <p className="label">
        {label} <span className="font-normal text-dim">({value.length})</span>
      </p>
      {value.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {value.map((url, i) => (
            <li key={`${url}-${i}`} className="group relative overflow-hidden rounded-xl border border-line bg-ink">
              <img src={url} alt={`Image ${i + 1}`} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/80 to-transparent p-1">
                <div className="flex">
                  <IconButton label={`Move image ${i + 1} left`} onClick={() => move(i, -1)} disabled={i === 0} className="h-8 w-8 text-white">
                    ‹
                  </IconButton>
                  <IconButton label={`Move image ${i + 1} right`} onClick={() => move(i, 1)} disabled={i === value.length - 1} className="h-8 w-8 text-white">
                    ›
                  </IconButton>
                </div>
                <IconButton label={`Remove image ${i + 1}`} onClick={() => onChange(value.filter((_, k) => k !== i))} danger className="h-8 w-8 text-white">
                  <Close size={14} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-[14px] text-dim">No images yet.</p>
      )}
      {busy && (
        <div className="mt-3">
          <p className="mb-1 text-[13px] text-muted">
            Uploading {busy.done + 1} of {busy.total}…
          </p>
          <ProgressBar value={busy.progress} />
        </div>
      )}
      {sizes.length > 0 && !busy && (
        <ul className="mt-2 space-y-0.5 text-[12px] text-dim" aria-label="Uploaded sizes">
          {sizes.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
      {errs.length > 0 && (
        <ul className="mt-2 space-y-1 text-[13px] text-danger" role="alert">
          {errs.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {error && (
        <p className="mt-2 text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={!!busy || value.length >= max}>
          <Upload size={16} /> Upload images
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLibraryOpen(true)} disabled={value.length >= max}>
          Choose from library
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        <label className="sr-only" htmlFor={pasteId}>
          Add image by URL
        </label>
        <input
          id={pasteId}
          className="field text-[14px]"
          placeholder="Paste /photos/… or https://…"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addPasted();
            }
          }}
        />
        <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={addPasted} disabled={!pasted.trim() || !isUrlish(pasted.trim())}>
          <Plus size={16} /> Add
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => void onFiles(e.target.files)}
      />
      <MediaModal
        open={libraryOpen}
        multiple
        onClose={() => setLibraryOpen(false)}
        onSelect={(url) => onChange([...value, url])}
        onSelectMany={(urls) => {
          onChange([...value, ...urls].slice(0, max));
          setLibraryOpen(false);
        }}
      />
    </div>
  );
}

/** Media library grid in a modal. */
export function MediaModal({
  open,
  onClose,
  onSelect,
  onSelectMany,
  multiple,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  onSelectMany?: (urls: string[]) => void;
  multiple?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Media library" description="Images uploaded to the site." wide>
      {open && <MediaGrid onSelect={onSelect} onSelectMany={onSelectMany} multiple={multiple} />}
    </Modal>
  );
}

function MediaGrid({
  onSelect,
  onSelectMany,
  multiple,
}: {
  onSelect: (url: string) => void;
  onSelectMany?: (urls: string[]) => void;
  multiple?: boolean;
}) {
  const { data, error, loading, reload } = useAdminData<{ items: MediaItem[] }>("/api/admin/media");
  const [picked, setPicked] = useState<string[]>([]);
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (loading && !data)
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-busy="true">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="skeleton aspect-square !rounded-xl" />
        ))}
      </div>
    );
  const items = data?.items ?? [];
  if (!items.length) return <Empty title="No uploads yet" body="Upload an image from any image field and it'll show up here." />;
  const toggle = (url: string) => setPicked((p) => (p.includes(url) ? p.filter((x) => x !== url) : [...p, url]));
  return (
    <div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {items.map((m) => {
          const sel = picked.includes(m.url);
          return (
            <li key={m.key}>
              <button
                type="button"
                onClick={() => (multiple && onSelectMany ? toggle(m.url) : onSelect(m.url))}
                aria-pressed={multiple ? sel : undefined}
                className={cx(
                  "group relative block w-full overflow-hidden rounded-xl border-2 bg-ink text-left transition-colors",
                  sel ? "border-accent" : "border-transparent hover:border-line-strong",
                )}
              >
                <img src={m.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4 text-[11px] text-white/80">
                  {fmtBytes(m.size)} · {new Date(m.uploaded).toLocaleDateString()}
                </span>
                <span className="sr-only">Select image uploaded {new Date(m.uploaded).toLocaleString()}</span>
                {sel && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[12px] font-bold text-white">
                    {picked.indexOf(m.url) + 1}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {multiple && onSelectMany && (
        <div className="glass sticky bottom-0 -mx-5 -mb-4 mt-4 flex items-center justify-between gap-2 border-t border-line px-5 py-3">
          <span className="text-[14px] text-muted">{picked.length} selected</span>
          <button type="button" className="btn btn-primary btn-sm" disabled={!picked.length} onClick={() => onSelectMany(picked)}>
            Add {picked.length || ""} image{picked.length === 1 ? "" : "s"}
          </button>
        </div>
      )}
    </div>
  );
}
