import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SitePayload } from "@shared/types";
import { loadSitePayload } from "./api";
import { DEFAULT_SETTINGS } from "./defaults";

interface SiteCtx {
  data: SitePayload | null;
  settings: SitePayload["settings"];
  error: Error | null;
  ready: boolean;
  reload: (fresh?: boolean) => Promise<void>;
}

const Ctx = createContext<SiteCtx | null>(null);

// Kick off the request as soon as the module is evaluated (before React renders).
let initial: Promise<SitePayload> | null = null;
// eslint-disable-next-line react-refresh/only-export-components
export function preloadSite() {
  if (!initial) initial = loadSitePayload();
  return initial;
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SitePayload | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    preloadSite()
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e))
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const reload = useCallback(async (fresh = true) => {
    try {
      const d = await loadSitePayload(fresh);
      setData(d);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setReady(true);
    }
  }, []);

  const value = useMemo<SiteCtx>(
    () => ({ data, settings: { ...DEFAULT_SETTINGS, ...(data?.settings ?? {}) }, error, ready, reload }),
    [data, error, ready, reload],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSite() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSite must be used inside SiteProvider");
  return c;
}
