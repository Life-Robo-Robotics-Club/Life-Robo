import { useRef, useState } from "react";
import { Trash, Upload } from "@/components/icons";
import { IMAGE_ACCEPT, UPLOAD_HINT, adminApi, checkImage, errorMessage, fmtBytes, sizeLabel, uploadImage, type MediaItem } from "./adminApi";
import { useAdminData } from "./hooks";
import { toast } from "./toast";
import { ConfirmDialog, Empty, IconButton, LoadError, PageHeader, Spinner } from "./ui";

export default function MediaPage() {
  const { data, error, loading, reload, mutate } = useAdminData<{ items: MediaItem[] }>("/api/admin/media");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<{ i: number; n: number; p: number } | null>(null);
  const [target, setTarget] = useState<MediaItem | null>(null);
  const [busy, setBusy] = useState(false);
  const items = data?.items ?? [];
  const total = items.reduce((s, m) => s + m.size, 0);

  const onFiles = async (files: File[]) => {
    if (!files.length) return;
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      const bad = checkImage(files[i]);
      if (bad) {
        toast.error(bad);
        continue;
      }
      setUploading({ i, n: files.length, p: -1 });
      try {
        const res = await uploadImage(
          files[i],
          (p) => setUploading({ i, n: files.length, p }),
          () => setUploading({ i, n: files.length, p: 0 }),
        );
        if (res.size < res.originalSize) toast.info(`${files[i].name}: ${sizeLabel(res)}`);
        ok++;
      } catch (err) {
        toast.error(`${files[i].name}: ${errorMessage(err)}`);
      }
    }
    setUploading(null);
    if (fileRef.current) fileRef.current.value = "";
    if (ok) {
      toast.success(`${ok} image${ok === 1 ? "" : "s"} uploaded`);
      reload();
    }
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Path copied");
    } catch {
      toast.error("Couldn't copy — select the text instead.");
    }
  };

  const remove = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await adminApi.del(`/api/admin/media/${target.key.split("/").map(encodeURIComponent).join("/")}`);
      mutate((d) => ({ items: d.items.filter((m) => m.key !== target.key) }));
      toast.success("Image deleted");
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
        title="Media library"
        subtitle={data ? `${items.length} uploaded image${items.length === 1 ? "" : "s"} · ${fmtBytes(total)}` : "Images uploaded to the site."}
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={!!uploading}>
            {uploading ? <Spinner size={14} /> : <Upload size={16} />}
            {uploading
              ? uploading.p < 0
                ? `Compressing ${uploading.i + 1}/${uploading.n}…`
                : `Uploading ${uploading.i + 1}/${uploading.n} · ${Math.round(uploading.p * 100)}%`
              : "Upload images"}
          </button>
        }
      />
      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => void onFiles(Array.from(e.target.files ?? []))}
      />
      <p className="mb-4 text-[13px] text-dim">
        {UPLOAD_HINT} Deleting an image here doesn't remove it from content that uses it — those spots will show a placeholder. Bundled photos under /photos/ aren't listed.
      </p>
      {error && !data ? (
        <LoadError error={error} onRetry={reload} />
      ) : loading && !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton aspect-square !rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Empty title="No uploads yet" body="Images you upload from any form, or here, will show up in this library." />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <li key={m.key} className="overflow-hidden rounded-xl border border-line bg-elev">
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="block bg-ink">
                <img src={m.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                <span className="sr-only">Open image in a new tab</span>
              </a>
              <div className="flex items-center gap-1 p-2">
                <button
                  type="button"
                  onClick={() => void copy(m.url)}
                  className="min-w-0 flex-1 rounded-md px-1.5 py-1 text-left hover:bg-white/5"
                  title="Copy path"
                >
                  <span className="block truncate font-mono text-[11px] text-muted">{m.url.split("/").pop()}</span>
                  <span className="block text-[11px] text-dim">
                    {fmtBytes(m.size)} · {new Date(m.uploaded).toLocaleDateString()}
                  </span>
                  <span className="sr-only">Copy path</span>
                </button>
                <IconButton label="Delete image" onClick={() => setTarget(m)} danger>
                  <Trash size={15} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={!!target}
        title="Delete this image?"
        body="It will be removed from storage. Anything still using it will show a placeholder."
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
