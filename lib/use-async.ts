import { useCallback, useEffect, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  refresh: () => void;
}

/**
 * Small fetch-on-mount(+deps)/refresh helper shared by every screen that
 * loads from the pulsewatch API. Intentionally minimal — no caching layer,
 * matching how small and bounded this data is (≤100 targets, per-target
 * incident counts small enough the API itself is unpaginated).
 */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // This *is* the synchronization with an external system (the pulsewatch
    // API) the lint rule asks effects to be about — there's no external
    // subscription to move these into, just a one-shot fetch per deps
    // change. Adopting a data-fetching library only to satisfy this rule
    // would be exactly the premature abstraction this project avoids
    // elsewhere.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    fn()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // deps are caller-controlled and intentionally spread into the array below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return { data, error, loading, refresh };
}
