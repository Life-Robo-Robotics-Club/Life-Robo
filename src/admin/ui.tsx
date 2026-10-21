import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { useBlocker } from "react-router";
import { cx } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { Check, ChevronDown, ChevronUp, Close, Plus, Trash } from "@/components/icons";
import { dismissToast, useToasts } from "./toast";
import { useBeforeUnload } from "./hooks";
import { fromLocalInput, toLocalInput } from "./utils";

/* ---------- Layout ---------- */

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back}
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** System-Settings style grouped container. */
export function Group({
  title,
  description,
  children,
  footer,
  className,
  actions,
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={cx("min-w-0", className)}>
      {(title || actions) && (
        <div className="mb-2 flex items-end justify-between gap-3 px-1">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold text-fg">{title}</h2>}
            {description && <p className="text-[13px] text-dim">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-elev p-4 sm:p-5">{children}</div>
      {footer && <div className="mt-2 px-1 text-[13px] text-dim">{footer}</div>}
    </section>
  );
}

export function Grid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={cx("grid grid-cols-1 gap-4", cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>{children}</div>;
}

/* ---------- Fields ---------- */

function FieldShell({
  id,
  label,
  hint,
  error,
  children,
  optional,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="label">
        {label}
        {optional && <span className="font-normal text-dim"> (optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-dim">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: ReactNode) =>
  error ? `${id}-err` : hint ? `${id}-hint` : undefined;

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
}

export function TextField({ label, value, onChange, hint, error, optional, className, ...rest }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <input
        id={id}
        className={cx("field", error && "border-danger", className)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...rest}
      />
    </FieldShell>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  hint,
  error,
  rows = 4,
  maxLength,
  optional,
  placeholder,
}: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
  error?: string;
  rows?: number;
  maxLength?: number;
  optional?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const counter = maxLength ? `${value.length}/${maxLength}` : undefined;
  return (
    <FieldShell id={id} label={label} hint={hint ?? counter} error={error} optional={optional}>
      <textarea
        id={id}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        className={cx("field", error && "border-danger")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint ?? counter)}
      />
    </FieldShell>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  error,
}: {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  hint?: ReactNode;
  error?: string;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        step={1}
        className={cx("field", error && "border-danger")}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Math.trunc(Number(e.target.value) || 0))}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
      />
    </FieldShell>
  );
}

export function SelectField<V extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  error,
}: {
  label: ReactNode;
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: string }[];
  hint?: ReactNode;
  error?: string;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        className={cx("field appearance-auto", error && "border-danger")}
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value as V)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/** datetime-local bound to an ISO string (or null when empty and `nullable`). */
export function DateTimeField({
  label,
  value,
  onChange,
  hint,
  error,
  nullable,
}: {
  label: ReactNode;
  value: string | null;
  onChange: (iso: string | null) => void;
  hint?: ReactNode;
  error?: string;
  nullable?: boolean;
}) {
  const id = useId();
  // Keep the raw text locally so partially typed values aren't wiped out.
  const [raw, setRaw] = useState(() => toLocalInput(value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (fromLocalInput(raw) !== value) setRaw(toLocalInput(value));
  }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const hintText = hint ?? `Your local time (${tz})${nullable ? " · leave empty for none" : ""}`;
  return (
    <FieldShell id={id} label={label} hint={hintText} error={error} optional={nullable}>
      <div className="flex gap-2">
        <input
          id={id}
          type="datetime-local"
          className={cx("field", error && "border-danger")}
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            const iso = fromLocalInput(e.target.value);
            if (iso || nullable) onChange(iso);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hintText)}
        />
        {nullable && value && (
          <button
            type="button"
            className="btn btn-ghost btn-sm shrink-0"
            onClick={() => {
              setRaw("");
              onChange(null);
            }}
            aria-label={`Clear ${typeof label === "string" ? label : "date"}`}
          >
            Clear
          </button>
        )}
      </div>
    </FieldShell>
  );
}

/** iOS-style switch. */
export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
  compact,
}: {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const id = useId();
  const sw = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-l`}
      aria-describedby={description ? `${id}-d` : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50",
        checked ? "bg-success" : "bg-white/20",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "absolute left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-transform duration-200",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
  if (compact) {
    return (
      <span className="inline-flex items-center gap-2">
        <span id={`${id}-l`} className="sr-only">
          {label}
        </span>
        {sw}
      </span>
    );
  }
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <span id={`${id}-l`} className="block text-[15px] text-fg">
          <label htmlFor={id} className="cursor-pointer">
            {label}
          </label>
        </span>
        {description && (
          <span id={`${id}-d`} className="block text-[13px] text-dim">
            {description}
          </span>
        )}
      </div>
      {sw}
    </div>
  );
}

/* ---------- Tags ---------- */

export function TagInput({
  label,
  value,
  onChange,
  hint,
  error,
  max = 20,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  hint?: string;
  error?: string;
  max?: number;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !value.includes(s));
    if (parts.length) onChange([...value, ...parts].slice(0, max));
    setDraft("");
  };
  return (
    <FieldShell id={id} label={label} hint={hint ?? "Press Enter or comma to add"} error={error}>
      <div className="field flex min-h-[44px] flex-wrap items-center gap-1.5 !py-1.5">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-white/10 py-0.5 pl-2.5 pr-1 text-[13px]">
            {t}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== t))}
              className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/15"
              aria-label={`Remove ${t}`}
            >
              <Close size={11} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={add}
          className="min-w-[8ch] flex-1 bg-transparent py-1 text-[15px] outline-none"
          placeholder={value.length ? "" : "Add a tag"}
          aria-describedby={`${id}-hint`}
          disabled={value.length >= max}
        />
      </div>
    </FieldShell>
  );
}

/* ---------- Repeatable rows ---------- */

export function ListEditor<T>({
  label,
  items,
  onChange,
  blank,
  render,
  addLabel = "Add row",
  max = 50,
  error,
  itemName = "row",
}: {
  label?: ReactNode;
  items: T[];
  onChange: (items: T[]) => void;
  blank: () => T;
  render: (item: T, update: (next: T) => void, index: number) => ReactNode;
  addLabel?: string;
  max?: number;
  error?: string;
  itemName?: string;
}) {
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-3">
      {label && <p className="label !mb-0">{label}</p>}
      {items.length === 0 && <p className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-center text-[14px] text-dim">Nothing here yet.</p>}
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 rounded-xl border border-line bg-elev-2/60 p-3">
          <div className="min-w-0 flex-1">{render(item, (n) => onChange(items.map((x, k) => (k === i ? n : x))), i)}</div>
          <div className="flex shrink-0 flex-col gap-1">
            <IconButton label={`Move ${itemName} ${i + 1} up`} onClick={() => move(i, -1)} disabled={i === 0}>
              <ChevronUp size={16} />
            </IconButton>
            <IconButton label={`Move ${itemName} ${i + 1} down`} onClick={() => move(i, 1)} disabled={i === items.length - 1}>
              <ChevronDown size={16} />
            </IconButton>
            <IconButton label={`Remove ${itemName} ${i + 1}`} onClick={() => onChange(items.filter((_, k) => k !== i))} danger>
              <Trash size={16} />
            </IconButton>
          </div>
        </div>
      ))}
      {error && (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}
      <div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...items, blank()])} disabled={items.length >= max}>
          <Plus size={16} /> {addLabel}
        </button>
      </div>
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  disabled,
  danger,
  className,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cx(
        "flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/10 hover:text-fg disabled:pointer-events-none disabled:opacity-30",
        danger && "hover:!bg-danger/15 hover:!text-danger",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------- Markdown ---------- */

export function MarkdownField({
  label,
  value,
  onChange,
  error,
  rows = 14,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  rows?: number;
}) {
  const id = useId();
  const [tab, setTab] = useState<"write" | "preview">("write");
  const tabs = [
    { key: "write" as const, label: "Write" },
    { key: "preview" as const, label: "Preview" },
  ];
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="label !mb-0">
          {label}
        </label>
        <div role="tablist" aria-label={`${label} mode`} className="inline-flex rounded-lg bg-white/[0.06] p-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`${id}-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`${id}-panel`}
              onClick={() => setTab(t.key)}
              className={cx(
                "rounded-md px-3 py-1 text-[13px] font-medium transition-colors",
                tab === t.key ? "bg-white/15 text-fg" : "text-muted hover:text-fg",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`}>
        {tab === "write" ? (
          <textarea
            id={id}
            rows={rows}
            className={cx("field font-mono text-[14px]", error && "border-danger")}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-help`}
            placeholder={"## Heading\n\nWrite in **Markdown**. Lists, links and images work."}
          />
        ) : value.trim() ? (
          <div
            className="prose-lr max-h-[560px] overflow-auto rounded-[10px] border border-line-strong bg-ink p-4 text-[15px]"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
          />
        ) : (
          <p className="rounded-[10px] border border-line-strong bg-ink p-4 text-[14px] text-dim">Nothing to preview yet.</p>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : (
        <p id={`${id}-help`} className="mt-1.5 text-[13px] text-dim">
          Markdown supported: **bold**, _italic_, [links](https://…), lists, ## headings.
        </p>
      )}
    </div>
  );
}

/* ---------- Feedback ---------- */

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cx("inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-line bg-elev p-3">
          <div className="skeleton h-12 w-12 shrink-0 !rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-2/5 !rounded-md" />
            <div className="skeleton h-3 w-1/4 !rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
      <p className="text-[19px] font-semibold text-fg">{title}</p>
      {body && <p className="max-w-md text-[15px] text-muted">{body}</p>}
      {action}
    </div>
  );
}

export function LoadError({ error, onRetry }: { error?: Error; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-danger/30 bg-danger/5 px-6 py-10 text-center">
      <p className="text-[17px] font-semibold text-fg">Couldn't load this</p>
      <p className="text-[15px] text-muted">{error?.message || "Something went wrong."}</p>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "green" | "blue" | "amber" | "red"; children: ReactNode }) {
  const map = {
    neutral: "bg-white/10 text-muted",
    green: "bg-success/15 text-success",
    blue: "bg-accent/15 text-accent",
    amber: "bg-warn/15 text-warn",
    red: "bg-danger/15 text-[#ff6961]",
  };
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium", map[tone])}>{children}</span>;
}

export function ErrorSummary({ errors }: { errors: Record<string, string> }) {
  const entries = Object.entries(errors);
  if (!entries.length) return null;
  return (
    <div role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-[14px]">
      <p className="font-semibold text-[#ff6961]">
        Please fix {entries.length === 1 ? "this field" : `these ${entries.length} fields`}:
      </p>
      <ul className="mt-1 list-disc pl-5 text-fg/90">
        {entries.map(([k, v]) => (
          <li key={k}>
            {k ? <span className="font-mono text-[13px] text-muted">{k}</span> : null}
            {k ? " — " : ""}
            {v}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Toasts ---------- */

export function Toaster() {
  const items = useToasts();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className={cx(
            "glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-[14px] shadow-2xl",
            t.kind === "error" ? "border-danger/40" : t.kind === "success" ? "border-success/30" : "border-line-strong",
          )}
        >
          <span
            aria-hidden="true"
            className={cx(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
              t.kind === "error" ? "bg-danger text-white" : t.kind === "success" ? "bg-success text-black" : "bg-accent text-white",
            )}
          >
            {t.kind === "error" ? "!" : t.kind === "success" ? <Check size={12} strokeWidth={3} /> : "i"}
          </span>
          <p className="min-w-0 flex-1 text-fg">{t.message}</p>
          <button type="button" onClick={() => dismissToast(t.id)} className="-m-1 rounded p-1 text-muted hover:text-fg" aria-label="Dismiss notification">
            <Close size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ---------- Modal (native <dialog>: focus trap, Esc, inert background) ---------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
  description,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  description?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-t`}
      aria-describedby={description ? `${id}-d` : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cx(
        "m-auto max-h-[min(88vh,900px)] w-[calc(100vw-24px)] overflow-hidden rounded-[20px] border border-line-strong bg-elev p-0 text-fg shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm",
        wide ? "max-w-4xl" : "max-w-md",
      )}
    >
      {open && (
        <div className="flex max-h-[min(88vh,900px)] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 id={`${id}-t`} className="text-[17px] font-semibold">
                {title}
              </h2>
              {description && (
                <p id={`${id}-d`} className="mt-0.5 text-[14px] text-muted">
                  {description}
                </p>
              )}
            </div>
            <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1">
              <Close size={16} />
            </IconButton>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  danger = true,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onCancel}
      title={title}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy} autoFocus>
            {cancelLabel}
          </button>
          <button type="button" className={cx("btn btn-sm", danger ? "btn-danger" : "btn-primary")} onClick={onConfirm} disabled={busy}>
            {busy && <Spinner size={14} />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-[15px] text-muted">{body ?? "This can't be undone."}</div>
    </Modal>
  );
}

/* ---------- Unsaved changes guard ---------- */

/** beforeunload + in-app navigation prompt while `when` is true. */
export function UnsavedGuard({ when }: { when: boolean }) {
  useBeforeUnload(when);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => when && currentLocation.pathname !== nextLocation.pathname,
  );
  const blocked = blocker.state === "blocked";
  // A save that navigates right away clears `when` a render later — let it through.
  useEffect(() => {
    if (blocked && !when) blocker.proceed();
  }, [blocked, when, blocker]);
  return (
    <ConfirmDialog
      open={blocked && when}
      title="Discard unsaved changes?"
      body="You have changes that haven't been saved. If you leave now, they'll be lost."
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      onConfirm={() => blocker.proceed?.()}
      onCancel={() => blocker.reset?.()}
    />
  );
}

/** Sticky bottom bar that appears when a form is dirty. */
export function SaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
  label = "Save changes",
  alwaysShow,
  extra,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard?: () => void;
  label?: string;
  alwaysShow?: boolean;
  extra?: ReactNode;
}) {
  if (!dirty && !alwaysShow) return null;
  return (
    <div className="sticky bottom-3 z-30 mt-8">
      <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line-strong px-4 py-3 shadow-2xl">
        <p className="flex items-center gap-2 text-[14px] text-muted" aria-live="polite">
          <span className={cx("h-2 w-2 rounded-full", dirty ? "bg-warn" : "bg-success")} aria-hidden="true" />
          {dirty ? "Unsaved changes" : "All changes saved"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {extra}
          {onDiscard && dirty && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onDiscard} disabled={saving}>
              Discard
            </button>
          )}
          <button type="button" className="btn btn-primary btn-sm" onClick={onSave} disabled={saving || !dirty}>
            {saving && <Spinner size={14} />}
            {saving ? "Saving…" : label}
          </button>
        </div>
      </div>
    </div>
  );
}
