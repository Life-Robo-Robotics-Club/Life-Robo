import { useId, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import type { SignupInput } from "@shared/types";
import { ApiError, api } from "@/lib/api";
import { useSite } from "@/lib/site";
import { usePageMeta } from "@/lib/seo";
import { cx } from "@/lib/format";
import { Socials } from "@/components/Layout";
import { ArrowRight, Check } from "@/components/icons";
import { EmptyState, PageHero, Reveal } from "@/components/ui";

type Field = "name" | "email" | "phone" | "course" | "interests";
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;
type Status = "idle" | "submitting" | "success";

const EMPTY: Values = { name: "", email: "", phone: "", course: "", interests: "" };
const FIELDS: Field[] = ["name", "email", "phone", "course", "interests"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(v: Values): Errors {
  const e: Errors = {};
  const name = v.name.trim();
  if (name.length < 2) e.name = "Please enter your name.";
  else if (name.length > 120) e.name = "Name is too long.";
  const email = v.email.trim();
  if (!email) e.email = "Please enter your email.";
  else if (!EMAIL_RE.test(email) || email.length > 200) e.email = "Please enter a valid email address.";
  if (v.phone && !/^[0-9+\-\s()]*$/.test(v.phone)) e.phone = "Use digits, spaces, +, - or brackets only.";
  else if (v.phone.trim().length > 20) e.phone = "Phone number is too long.";
  if (v.course.trim().length > 120) e.course = "Keep this under 120 characters.";
  if (v.interests.trim().length > 1500) e.interests = "Keep this under 1500 characters.";
  return e;
}

const inputCls =
  "w-full rounded-2xl border bg-elev-2 px-4 py-3 text-[17px] text-fg placeholder:text-dim transition-[border-color,box-shadow] duration-200 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/25";

function FormField({
  id,
  label,
  hint,
  error,
  optional,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[15px] font-medium text-fg">
        {label}
        {optional && <span className="ml-2 font-normal text-dim">Optional</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-2 text-[13px] text-dim">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-2 text-[14px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Success({ name }: { name: string }) {
  const { settings } = useSite();
  const first = name.trim().split(/\s+/)[0];
  return (
    <div className="card px-6 py-12 text-center sm:px-12 sm:py-16">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
        <Check size={30} />
      </div>
      <h2 className="title mt-6">You're on the list{first ? `, ${first}` : ""}!</h2>
      <p className="mx-auto mt-4 max-w-md text-muted">Thanks for signing up. Here's what happens next:</p>
      <ol className="mx-auto mt-8 max-w-md space-y-4 text-left">
        {[
          "A club lead will reach out by email or phone with orientation details.",
          "Come to the next workshop or build night — no experience needed.",
          "Pick a track and start building with a team.",
        ].map((s, i) => (
          <li key={i} className="flex gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[14px] font-semibold text-accent">
              {i + 1}
            </span>
            <span className="text-[15px] text-muted">{s}</span>
          </li>
        ))}
      </ol>
      <div className="mt-10 flex flex-col items-center gap-4">
        <p className="text-[14px] text-dim">Follow along for announcements</p>
        <Socials socials={settings.socials} className="justify-center" />
        <Link to="/events" className="btn btn-ghost mt-2">
          See upcoming events <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}

export default function Join() {
  const { settings } = useSite();
  usePageMeta(settings.joinHeading || "Join", settings.joinBody || "Sign up to join Life Robo, the robotics club at FoET, University of Lucknow.");
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<Values>(EMPTY);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [closed, setClosed] = useState(false);

  const id = (f: Field) => `${uid}-${f}`;
  const focusField = (f: Field) => formRef.current?.querySelector<HTMLElement>(`[name="${f}"]`)?.focus();

  const onChange = (f: Field) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [f]: value }));
    if (errors[f]) setErrors((er) => ({ ...er, [f]: undefined }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;
    const errs = validate(values);
    setErrors(errs);
    const firstBad = FIELDS.find((f) => errs[f]);
    if (firstBad) {
      const n = Object.keys(errs).length;
      setMessage(`Please fix ${n} ${n === 1 ? "field" : "fields"} highlighted below.`);
      focusField(firstBad);
      return;
    }
    setStatus("submitting");
    setMessage("Sending your sign-up…");
    const body: SignupInput = {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      course: values.course.trim(),
      interests: values.interests.trim(),
      website,
    };
    try {
      await api<{ ok: true }>("/api/signup", { method: "POST", body: JSON.stringify(body) });
      setStatus("success");
      setMessage("Sign-up received. Welcome to Life Robo!");
    } catch (err) {
      setStatus("idle");
      if (err instanceof ApiError && err.status === 400 && err.issues?.length) {
        const mapped: Errors = {};
        for (const issue of err.issues) {
          const key = (Array.isArray(issue.path) ? issue.path[0] : issue.path?.split(".")[0]) as Field | undefined;
          if (key && FIELDS.includes(key) && !mapped[key]) mapped[key] = issue.message;
        }
        setErrors(mapped);
        const first = FIELDS.find((f) => mapped[f]);
        setMessage(first ? "Please check the highlighted fields." : err.message);
        if (first) focusField(first);
      } else if (err instanceof ApiError && err.status === 429) {
        setMessage("Too many sign-ups from your network in the last hour. Please try again a little later.");
      } else if (err instanceof ApiError && err.status === 403) {
        setClosed(true);
        setMessage("Sign-ups have just closed. Follow us to hear when they reopen.");
      } else {
        setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    }
  };

  const describedBy = (f: Field, hint?: boolean) =>
    errors[f] ? `${id(f)}-error` : hint ? `${id(f)}-hint` : undefined;
  const fieldProps = (f: Field, hint?: boolean) => ({
    id: id(f),
    name: f,
    value: values[f],
    onChange: onChange(f),
    "aria-invalid": errors[f] ? true : undefined,
    "aria-describedby": describedBy(f, hint),
    className: cx(inputCls, errors[f] ? "border-danger" : "border-line-strong"),
    readOnly: status === "submitting",
  });

  const isClosed = !settings.joinOpen || closed;
  const submitting = status === "submitting";

  return (
    <>
      <PageHero eyebrow="Membership" title={settings.joinHeading || "Join Life Robo"} intro={settings.joinBody || undefined} />
      <section className="container-x pb-24 md:pb-32" aria-label="Sign-up">
        <div className="mx-auto max-w-2xl">
          <p role="status" aria-live="polite" className={cx(message && status !== "success" ? "mb-6 rounded-2xl border border-line bg-elev px-5 py-4 text-[15px] text-fg" : "sr-only")}>
            {message}
          </p>
          {status === "success" ? (
            <Reveal>
              <Success name={values.name} />
            </Reveal>
          ) : isClosed ? (
            <EmptyState
              title="Sign-ups are closed right now"
              body="We open recruitment at the start of each semester. Follow us to hear the moment it reopens."
              instagram={settings.socials?.instagram}
              action={
                <Link to="/events" className="btn btn-ghost">
                  See events
                </Link>
              }
            />
          ) : (
            <Reveal>
              <form ref={formRef} onSubmit={onSubmit} noValidate className="card space-y-6 p-6 sm:p-10" aria-busy={submitting}>
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField id={id("name")} label="Full name" error={errors.name}>
                    <input type="text" autoComplete="name" required maxLength={120} {...fieldProps("name")} />
                  </FormField>
                  <FormField id={id("email")} label="Email" error={errors.email}>
                    <input type="email" autoComplete="email" inputMode="email" required maxLength={200} {...fieldProps("email")} />
                  </FormField>
                  <FormField id={id("phone")} label="Phone" optional error={errors.phone}>
                    <input type="tel" autoComplete="tel" inputMode="tel" maxLength={20} {...fieldProps("phone")} />
                  </FormField>
                  <FormField id={id("course")} label="Year / branch" optional hint="e.g. B.Tech 2nd year, CSE" error={errors.course}>
                    <input type="text" maxLength={120} {...fieldProps("course", true)} />
                  </FormField>
                </div>
                <FormField
                  id={id("interests")}
                  label="What are you interested in?"
                  optional
                  hint="Robotics, embedded, AI, design, events — anything goes."
                  error={errors.interests}
                >
                  <textarea rows={4} maxLength={1500} {...fieldProps("interests", true)} />
                </FormField>

                {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
                <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
                  <label htmlFor={`${uid}-website`}>Website</label>
                  <input
                    id={`${uid}-website`}
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <div className="flex flex-col-reverse gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[13px] text-dim">We only use your details to contact you about the club.</p>
                  <button type="submit" className="btn btn-primary min-w-[160px] disabled:opacity-60" disabled={submitting}>
                    {submitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" aria-hidden="true" />
                        Sending…
                      </>
                    ) : (
                      <>
                        Sign me up <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </Reveal>
          )}
        </div>
      </section>
    </>
  );
}
