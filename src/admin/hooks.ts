import { useCallback, useEffect, useState } from "react";
import { adminApi } from "./adminApi";

interface State<T> {
  key: string;
  path: string;
  data?: T;
  error?: Error;
}

/**
 * Admin data hook. `reload()` refetches while keeping the previous data on screen;
 * `mutate()` patches the cached data optimistically.
 */
export function useAdminData<T>(path: string | null) {
  const [nonce, setNonce] = useState(0);
  const key = path ? `${path}#${nonce}` : "";
  const [state, setState] = useState<State<T>>({ key: "", path: "" });

  useEffect(() => {
    if (!path) return;
    const ctrl = new AbortController();
    adminApi
      .get<T>(path, ctrl.signal)
      .then((data) => setState({ key, path, data }))
      .catch((error: Error) => {
        if (!ctrl.signal.aborted) setState({ key, path, error });
      });
    return () => ctrl.abort();
  }, [path, key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const mutate = useCallback((fn: (d: T) => T) => {
    setState((s) => (s.data === undefined ? s : { ...s, data: fn(s.data) }));
  }, []);

  const samePath = state.path === path;
  const settled = state.key === key;
  return {
    data: samePath ? state.data : undefined,
    error: settled ? state.error : undefined,
    loading: !!path && !settled,
    reload,
    mutate,
  };
}

/** Warns before closing/reloading the tab while there are unsaved changes. */
export function useBeforeUnload(when: boolean) {
  useEffect(() => {
    if (!when) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [when]);
}
