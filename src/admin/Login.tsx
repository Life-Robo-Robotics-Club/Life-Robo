import { useId, useState } from "react";
import { Badge } from "@/components/Brand";
import { ApiError, adminApi } from "./adminApi";
import { Spinner } from "./ui";

export default function Login({ onSuccess, expired }: { onSuccess: () => void; expired?: boolean }) {
  const id = useId();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; locked?: boolean } | null>(null);

  const submit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.post("/api/admin/login", { password });
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError({ message: err.message || "Too many attempts. Try again in 15 minutes.", locked: true });
      } else if (err instanceof ApiError && err.status === 401) {
        setError({ message: "That password isn't right. Try again." });
      } else {
        setError({ message: err instanceof Error ? err.message : "Couldn't sign in." });
      }
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-canvas px-4 py-12">
      <div className="tech-grid mask-fade-b pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="relative w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <Badge size={72} />
          <h1 className="mt-5 text-[26px] font-semibold tracking-[-0.02em]">Life Robo Admin</h1>
          <p className="mt-1 text-[15px] text-muted">Sign in to manage the club website.</p>
        </div>
        <form onSubmit={submit} className="rounded-[22px] border border-line bg-elev p-5 shadow-2xl sm:p-6" noValidate>
          {expired && !error && (
            <p className="mb-4 rounded-xl bg-warn/10 px-3 py-2 text-[14px] text-warn" role="status">
              Your session expired. Please sign in again.
            </p>
          )}
          <label htmlFor={id} className="label">
            Password
          </label>
          <div className="relative">
            <input
              id={id}
              type={show ? "text" : "password"}
              autoComplete="current-password"
              autoFocus
              required
              className={`field !min-h-[44px] pr-16 ${error && !error.locked ? "border-danger" : ""}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-err` : undefined}
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[13px] text-accent hover:bg-white/5"
              aria-pressed={show}
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
          {error && (
            <div
              id={`${id}-err`}
              role="alert"
              className={`mt-3 rounded-xl px-3 py-2 text-[14px] ${error.locked ? "bg-warn/10 text-warn" : "bg-danger/10 text-[#ff6961]"}`}
            >
              {error.locked && <strong className="block">Sign-in temporarily locked</strong>}
              {error.message}
            </div>
          )}
          <button type="submit" className="btn btn-primary mt-5 w-full" disabled={busy || !password}>
            {busy && <Spinner size={16} />}
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-[13px] text-dim">
          <a href="/" className="hover:text-fg">
            ← Back to the site
          </a>
        </p>
      </div>
    </main>
  );
}
