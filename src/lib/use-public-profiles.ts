import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  ListPublicProfilesQuery,
  ListPublicProfilesResponse,
  PublicProfileDetail,
} from './api';
import { useApiClientFactory } from './use-api-client';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const REQUEST_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Request timed out after ${ms / 1000}s`));
    }, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('Aborted'));
    });
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export function usePublicProfiles(query: ListPublicProfilesQuery) {
  const factory = useApiClientFactory();

  // Stabilize factory via ref so it doesn't bust effect deps when Clerk re-renders.
  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  const [state, setState] = useState<FetchState<ListPublicProfilesResponse>>({
    data: null,
    loading: true,
    error: null,
  });

  // The ONLY effect dep is the query JSON — guarantees one fetch per query change.
  const queryKey = JSON.stringify(query);

  const load = useCallback(async (signal?: AbortSignal) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const client = await factoryRef.current();
      const promise = client.listPublicProfiles(JSON.parse(queryKey));
      const data = signal ? await withTimeout(promise, REQUEST_TIMEOUT_MS, signal) : await promise;
      if (signal?.aborted) return;
      setState({ data, loading: false, error: null });
    } catch (e) {
      if (signal?.aborted) return;
      setState({
        data: null,
        loading: false,
        error: e instanceof Error ? e.message : 'Could not load profiles.',
      });
    }
  }, [queryKey]);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  return { ...state, refresh: () => load() };
}

export function usePublicProfile(id: string | undefined) {
  const factory = useApiClientFactory();
  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  const [state, setState] = useState<FetchState<PublicProfileDetail>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();

    (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const client = await factoryRef.current();
        const data = await withTimeout(client.getPublicProfile(id), REQUEST_TIMEOUT_MS, ctrl.signal);
        if (ctrl.signal.aborted) return;
        setState({ data, loading: false, error: null });
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setState({
          data: null,
          loading: false,
          error: e instanceof Error ? e.message : 'Profile not found.',
        });
      }
    })();

    return () => ctrl.abort();
  }, [id]);

  return state;
}
