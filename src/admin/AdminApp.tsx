import { useCallback, useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router";
import { Collection } from "./Collection";
import { ApiError, UNAUTHORIZED_EVENT, adminApi } from "./adminApi";
import AttendancePage from "./AttendancePage";
import { alertsConfig, eventsConfig, galleryConfig, partnersConfig, postsConfig, projectsConfig, teamConfig } from "./configs";
import Dashboard from "./Dashboard";
import Login from "./Login";
import MediaPage from "./MediaPage";
import SettingsPage from "./SettingsPage";
import Shell from "./Shell";
import SignupsPage from "./SignupsPage";
import { toast } from "./toast";
import { Empty, Spinner, Toaster } from "./ui";

type Auth = "checking" | "in" | "out" | "expired" | "offline";

/** Ensure crawlers never index the admin (the Worker also sends X-Robots-Tag). */
function useNoIndex() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Admin · Life Robo";
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const created = !meta;
    const prev = meta?.content;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.content = "noindex, nofollow";
    return () => {
      document.title = prevTitle;
      if (created) meta?.remove();
      else if (meta && prev != null) meta.content = prev;
    };
  }, []);
}

export default function AdminApp() {
  useNoIndex();
  const [auth, setAuth] = useState<Auth>("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .get("/api/admin/me")
      .then(() => !cancelled && setAuth("in"))
      .catch((err) => {
        if (cancelled) return;
        setAuth(err instanceof ApiError && err.status === 401 ? "out" : "offline");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    const onUnauthorized = () => setAuth((a) => (a === "in" ? "expired" : a));
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminApi.post("/api/admin/logout");
    } catch {
      /* cookie is cleared server-side either way; fall through */
    }
    setAuth("out");
    toast.info("You've been logged out.");
  }, []);

  let body;
  if (auth === "checking") {
    body = (
      <div className="flex min-h-dvh items-center justify-center bg-canvas text-muted">
        <Spinner size={22} />
      </div>
    );
  } else if (auth === "offline") {
    body = (
      <div className="flex min-h-dvh items-center justify-center bg-canvas p-4">
        <div className="w-full max-w-md">
          <Empty
            title="Can't reach the server"
            body="Check your connection and try again."
            action={
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setAuth("checking");
                  setAttempt((n) => n + 1);
                }}
              >
                Retry
              </button>
            }
          />
        </div>
      </div>
    );
  } else if (auth !== "in") {
    body = <Login expired={auth === "expired"} onSuccess={() => setAuth("in")} />;
  } else {
    body = (
      <Routes>
        <Route element={<Shell onLogout={() => void logout()} />}>
          <Route index element={<Dashboard />} />
          <Route path="alerts/*" element={<Collection key="alerts" config={alertsConfig} />} />
          <Route path="content" element={<SettingsPage />} />
          <Route path="events/*" element={<Collection key="events" config={eventsConfig} />} />
          <Route path="projects/*" element={<Collection key="projects" config={projectsConfig} />} />
          <Route path="team/*" element={<Collection key="team" config={teamConfig} />} />
          <Route path="gallery/*" element={<Collection key="gallery" config={galleryConfig} />} />
          <Route path="blog/*" element={<Collection key="blog" config={postsConfig} />} />
          <Route path="partners/*" element={<Collection key="partners" config={partnersConfig} />} />
          <Route path="attendance/*" element={<AttendancePage />} />
          <Route path="signups" element={<SignupsPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route
            path="*"
            element={
              <Empty
                title="Page not found"
                body="That admin page doesn't exist."
                action={
                  <Link to="/admin" className="btn btn-ghost btn-sm">
                    Go to dashboard
                  </Link>
                }
              />
            }
          />
        </Route>
      </Routes>
    );
  }

  return (
    <>
      {body}
      <Toaster />
    </>
  );
}
