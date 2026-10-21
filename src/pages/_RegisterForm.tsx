import { useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { ClubEvent, RegistrationInput } from "@shared/types";
import { ApiError, api } from "@/lib/api";
import { cx } from "@/lib/format";
import { ArrowRight, Check } from "@/components/icons";

type Field = "name" | "email" | "phone" | "course";
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;

const FIELDS: Field[] = ["name", "email", "phone", "course"];
const EMPTY: Values = { name: "", email: "", phone: "", course: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(v: Values): Errors {
  const e: Errors = {};
  if (v.name.trim().length < 2) e.name = "Please enter your name.";
  if (!EMAIL_RE.test(v.email.trim())) e.email = "Please enter a valid email address.";
  if (v.phone && !/^[0-9+\-\s()]*$/.test(v.phone)) e.phone = "Use digits, spaces, +, - or brackets only.";
  return e;
}

const inputCls =
  "w-full rounded-2xl border bg-elev-2 px-4 py-3 text-[17px] text-fg placeholder:text-dim transition-[border-color,box-shadow] duration-200 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/25";

/** On-site registration for one event. Confirmation goes out by email from the Worker. */
export function RegisterForm({ event }: { event: ClubEvent }) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>(EMPTY);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState<{ emailed: boolean } | null>(null);

  const id = (f: Field) => `${uid}-${f}`;
  const onChange = (f: Field) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [f]: value }));
    if (errors[f]) setErrors((er) => ({ ...er, [f]: undefined }));
  };
  const focus = (f: Field) => formRef.current?.querySelector<HTMLElement>(`[name="${f}"]`)?.focus();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const errs = validate(values);
    setErrors(errs);
    const bad = FIELDS.find((f) => errs[f]);
    if (bad) {
      setMessage("Please check the highlighted fields.");
      focus(bad);
      return;
    }
    setBusy(true);
    setMessage("");
    const body: RegistrationInput = {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      course: values.course.trim(),
      website,
    };
    try {
      const res = await api<{ ok: true; emailed?: boolean }>(`/api/events/${encodeURIComponent(event.slug)}/register`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setDone({ emailed: res.emailed !== false });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.issues?.length) {
        const mapped: Errors = {};
        for (const issue of err.issues) {
          const key = (Array.isArray(issue.path) ? issue.path[0] : issue.path?.split(".")[0]) as Field | undefined;
          if (key && FIELDS.includes(key) && !mapped[key]) mapped[key] = issue.message;
        }
        setErrors(mapped);
        const first = FIELDS.find((f) => mapped[f]);
        setMessage("Please check the highlighted fields.");
        if (first) focus(first);
      } else {
        setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="card flex gap-4 p-6" role="status">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
          <Check size={20} />
        </span>
        <div>
          <p className="text-[19px] font-semibold">You're registered.</p>
          <p className="mt-1 text-[15px] text-muted">
            {done.emailed
              ? `We've sent a confirmation to ${values.email.trim()}. Check your spam folder if it isn't there in a few minutes.`
              : "Your spot is saved. Just give your name at the desk when you arrive."}{" "}
            Attendance is taken at the venue, and everyone marked present gets a certificate by email.
          </p>
        </div>
      </div>
    );
  }

  const props = (f: Field) => ({
    id: id(f),
    name: f,
    value: values[f],
    onChange: onChange(f),
    readOnly: busy,
    "aria-invalid": errors[f] ? true : undefined,
    "aria-describedby": errors[f] ? `${id(f)}-error` : undefined,
    className: cx(inputCls, errors[f] ? "border-danger" : "border-line-strong"),
  });
  const err = (f: Field) =>
    errors[f] ? (
      <p id={`${id(f)}-error`} className="mt-2 text-[14px] text-danger">
        {errors[f]}
      </p>
    ) : null;

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="card space-y-5 p-6 sm:p-8" aria-busy={busy} aria-labelledby={`${uid}-title`}>
      <div>
        <h2 id={`${uid}-title`} className="text-[21px] font-semibold tracking-tight">
          Register for this event
        </h2>
        <p className="mt-1 text-[14px] text-dim">Free. You'll get a confirmation email, and a certificate after you attend.</p>
      </div>
      {message && (
        <p role="alert" className="rounded-2xl border border-line bg-elev-2 px-4 py-3 text-[15px]">
          {message}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={id("name")} className="mb-2 block text-[15px] font-medium">
            Full name
          </label>
          <input type="text" autoComplete="name" maxLength={120} required {...props("name")} />
          {err("name")}
          {!errors.name && <p className="mt-2 text-[13px] text-dim">As it should appear on your certificate.</p>}
        </div>
        <div>
          <label htmlFor={id("email")} className="mb-2 block text-[15px] font-medium">
            Email
          </label>
          <input type="email" autoComplete="email" inputMode="email" maxLength={200} required {...props("email")} />
          {err("email")}
        </div>
        <div>
          <label htmlFor={id("phone")} className="mb-2 block text-[15px] font-medium">
            Phone <span className="ml-1 font-normal text-dim">Optional</span>
          </label>
          <input type="tel" autoComplete="tel" inputMode="tel" maxLength={20} {...props("phone")} />
          {err("phone")}
        </div>
        <div>
          <label htmlFor={id("course")} className="mb-2 block text-[15px] font-medium">
            Year / branch <span className="ml-1 font-normal text-dim">Optional</span>
          </label>
          <input type="text" maxLength={120} placeholder="B.Tech 2nd year, CSE" {...props("course")} />
          {err("course")}
        </div>
      </div>
      {/* Honeypot */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={`${uid}-website`}>Website</label>
        <input id={`${uid}-website`} type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <button type="submit" className="btn btn-primary w-full disabled:opacity-60 sm:w-auto" disabled={busy}>
        {busy ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" aria-hidden="true" />
            Registering…
          </>
        ) : (
          <>
            Register <ArrowRight size={18} />
          </>
        )}
      </button>
    </form>
  );
}
