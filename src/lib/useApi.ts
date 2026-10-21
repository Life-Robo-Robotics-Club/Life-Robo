import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

interface State<T> {
  key: string;
  data?: T;
  error?: Error;
}

/**
 * Tiny data hook: loading / error / retry without a cache library.
 * Loading is derived (state.key !== current key) so no setState runs synchronously in the effect.
 */
export function useApi<T>(path: string | null) {
  const [nonce, setNonce] = useState(0);
  const key = path ? `${path}#${nonce}` : "";
  const [state, setState] = useState<State<T>>({ key: "" });

  useEffect(() => {
    if (!path) return;
    const ctrl = new AbortController();
    api<T>(path, { signal: ctrl.signal, cache: nonce > 0 ? "no-store" : "default" })
      .then((data) => setState({ key, data }))
      .catch((error: Error) => {
        if (ctrl.signal.aborted) return;
        setState({ key, error });
      });
    return () => ctrl.abort();
  }, [path, key, nonce]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  const settled = state.key === key;
  return {
    data: settled ? state.data : undefined,
    error: settled ? state.error : undefined,
    loading: !!path && !settled,
    retry,
  };
}
