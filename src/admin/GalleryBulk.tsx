import { useRef, useState } from "react";
import type { GalleryImage } from "@shared/types";
import { cx } from "@/lib/format";
import { Check, Upload } from "@/components/icons";
import { IMAGE_ACCEPT, UPLOAD_HINT, adminApi, checkImage, errorMessage, sizeLabel, uploadImage } from "./adminApi";
import { EventSelect } from "./forms";
import { toast } from "./toast";
import { Group, Spinner, Toggle } from "./ui";

interface Job {
  name: string;
  status: "queued" | "compressing" | "uploading" | "saving" | "done" | "error";
  progress: number;
  error?: string;
  sizes?: string;
}

const altFromName = (name: string) =>
  name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);

/** Pick many files → upload one by one → create a gallery row for each. */
export function GalleryBulk({ reload }: { items: GalleryImage[]; reload: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [eventId, setEventId] = useState<number | null>(null);
  const [featured, setFeatured] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);

  const patch = (i: number, p: Partial<Job>) => setJobs((js) => js.map((j, k) => (k === i ? { ...j, ...p } : j)));

  const run = async (files: File[]) => {
    if (!files.length) return;
    setRunning(true);
    setJobs(files.map((f) => ({ name: f.name, status: "queued", progress: 0 })));
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const bad = checkImage(f);
      if (bad) {
        patch(i, { status: "error", error: bad });
        continue;
      }
      try {
        patch(i, { status: "compressing" });
        const up = await uploadImage(
          f,
          (p) => patch(i, { progress: p }),
          (c) => patch(i, { status: "uploading", sizes: sizeLabel(c) }),
        );
        patch(i, { status: "saving", progress: 1, sizes: sizeLabel(up) });
        await adminApi.post("/api/admin/gallery", { url: up.url, alt: altFromName(f.name), caption: "", eventId, featured });
        patch(i, { status: "done" });
        ok++;
      } catch (err) {
        patch(i, { status: "error", error: errorMessage(err) });
      }
    }
    setRunning(false);
    if (fileRef.current) fileRef.current.value = "";
    if (ok) {
      toast.success(`${ok} photo${ok === 1 ? "" : "s"} added to the gallery — live within ~30 seconds`);
      reload();
    }
    if (ok < files.length) toast.error(`${files.length - ok} file${files.length - ok === 1 ? "" : "s"} couldn't be added.`);
  };

  const done = jobs.filter((j) => j.status === "done").length;

  if (!open) {
    return (
      <div className="mb-6">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
          <Upload size={16} /> Bulk upload photos
        </button>
      </div>
    );
  }

  return (
    <Group
      className="mb-8"
      title="Bulk upload"
      description="Pick several photos; each is uploaded and added to the gallery in turn. Add captions afterwards."
      actions={
        !running && (
          <button type="button" className="text-[14px] text-accent hover:underline" onClick={() => setOpen(false)}>
            Close
          </button>
        )
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <EventSelect value={eventId} onChange={setEventId} label="Attach to event" />
        <div className="sm:pt-6">
          <Toggle label="Mark as featured" checked={featured} onChange={setFeatured} disabled={running} />
        </div>
      </div>
      <div
        className={cx(
          "flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong px-4 py-8 text-center",
          running && "opacity-60",
        )}
        onDragOver={(e) => {
          if (!running && e.dataTransfer.types.includes("Files")) e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (!running) void run(Array.from(e.dataTransfer.files));
        }}
      >
        <p className="text-[15px] text-muted">Drop photos here or</p>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={running}>
          {running ? <Spinner size={14} /> : <Upload size={16} />} {running ? "Uploading…" : "Select photos"}
        </button>
        <p className="max-w-md text-[12px] text-dim">{UPLOAD_HINT}</p>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={IMAGE_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => void run(Array.from(e.target.files ?? []))}
        />
      </div>
      {jobs.length > 0 && (
        <div>
          <p className="mb-2 text-[13px] text-muted" aria-live="polite">
            {done} of {jobs.length} added
          </p>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={jobs.length} aria-valuenow={done} aria-label="Bulk upload progress">
            <div className="h-full bg-accent transition-[width]" style={{ width: `${(done / jobs.length) * 100}%` }} />
          </div>
          <ul className="max-h-64 space-y-1 overflow-auto text-[13px]">
            {jobs.map((j, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-5 shrink-0">
                  {j.status === "done" ? (
                    <Check size={14} className="text-success" />
                  ) : j.status === "error" ? (
                    <span className="font-bold text-danger">!</span>
                  ) : j.status === "queued" ? (
                    <span className="text-dim">·</span>
                  ) : (
                    <Spinner size={12} />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-fg/90">{j.name}</span>
                <span className={cx("shrink-0", j.status === "error" ? "text-danger" : "text-dim")}>
                  {j.sizes && j.status !== "error" ? `${j.sizes} · ` : ""}
                  {j.status === "uploading"
                    ? `${Math.round(j.progress * 100)}%`
                    : j.status === "error"
                      ? j.error
                      : j.status === "saving"
                        ? "saving…"
                        : j.status === "compressing"
                          ? "compressing…"
                          : j.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Group>
  );
}
