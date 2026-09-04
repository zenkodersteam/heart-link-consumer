import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  ListPublicProfilesQuery,
  ListPublicProfilesResponse,
  PublicProfileDetail,
} from './api';
import { PREVIEW_BYPASS_AUTH, PREVIEW_DETAILS } from './preview';
import { useApiClientFactory } from './use-api-client';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  /** The caught value itself; screens word it via ErrorState/humanError. */
  error: unknown;
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
  const [loadingMore, setLoadingMore] = useState(false);

  // The ONLY effect dep is the query JSON - guarantees one fetch per query change.
  // `offset` is deliberately excluded: paging is additive and handled by
  // loadMore, so changing the page must not re-run the first-page effect.
  const { offset: _ignoredOffset, ...filters } = query;
  const queryKey = JSON.stringify(filters);

  const load = useCallback(async (signal?: AbortSignal) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const client = await factoryRef.current();
      const promise = client.listPublicProfiles({ ...JSON.parse(queryKey), offset: 0 });
      const data = signal ? await withTimeout(promise, REQUEST_TIMEOUT_MS, signal) : await promise;
      if (signal?.aborted) return;
      setState({ data, loading: false, error: null });
    } catch (e) {
      if (signal?.aborted) return;
      setState({
        data: null,
        loading: false,
        error: e,
      });
    }
  }, [queryKey]);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const items = state.data?.items ?? [];
  const total = state.data?.total ?? 0;
  const hasMore = items.length < total;

  /**
   * Fetch the next page and append it.
   *
   * Browsing stopped dead at the first twenty profiles because nothing ever
   * asked for more, however many were available. New pages are appended rather
   * than replacing the deck, so cards already on screen are not pulled away
   * mid-swipe.
   */
  const loadMore = useCallback(async () => {
    if (loadingMore || state.loading) return;
    const current = state.data;
    if (!current || current.items.length >= current.total) return;
    setLoadingMore(true);
    try {
      const client = await factoryRef.current();
      const next = await client.listPublicProfiles({
        ...JSON.parse(queryKey),
        offset: current.items.length,
      });
      setState((s) => {
        const existing = s.data?.items ?? [];
        const seen = new Set(existing.map((i) => i.id));
        // Guard against duplicates: a profile activated between pages shifts
        // every later row, which would otherwise repeat a card in the deck.
        const merged = [...existing, ...next.items.filter((i) => !seen.has(i.id))];
        return { ...s, data: { ...next, items: merged } };
      });
    } catch {
      // Silent: the deck still has cards, and an error banner over a working
      // deck is worse than quietly stopping at what we have.
    } finally {
      setLoadingMore(false);
    }
  }, [queryKey, loadingMore, state.loading, state.data]);

  return { ...state, hasMore, loadingMore, loadMore, refresh: () => load() };
}

// Module-level cache so a profile's detail is resolved synchronously on
// remount (e.g. when a deck card advances from "behind" to "front"). Without
// this, the front card flashes its summary-only rows for a frame before detail
// arrives, which reads as the card content "changing" mid-swap.
const detailCache = new Map<string, PublicProfileDetail>();

function initialDetail(id: string | undefined): FetchState<PublicProfileDetail> {
  if (id && detailCache.has(id)) return { data: detailCache.get(id) ?? null, loading: false, error: null };
  if (id && PREVIEW_BYPASS_AUTH && PREVIEW_DETAILS[id]) return { data: PREVIEW_DETAILS[id], loading: false, error: null };
  return { data: null, loading: !!id, error: null };
}

export function usePublicProfile(id: string | undefined) {
  const factory = useApiClientFactory();
  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  const [state, setState] = useState<FetchState<PublicProfileDetail>>(() => initialDetail(id));
  // Bumped by reload() to re-run the fetch. A failed load leaves nothing
  // cached, so retrying is just asking again.
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!id) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    if (detailCache.has(id)) {
      setState({ data: detailCache.get(id) ?? null, loading: false, error: null });
      return;
    }
    // Preview mode: serve canned detail without a network call (no token).
    if (PREVIEW_BYPASS_AUTH && PREVIEW_DETAILS[id]) {
      detailCache.set(id, PREVIEW_DETAILS[id]);
      setState({ data: PREVIEW_DETAILS[id], loading: false, error: null });
      return;
    }

    const ctrl = new AbortController();

    (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const client = await factoryRef.current();
        const data = await withTimeout(client.getPublicProfile(id), REQUEST_TIMEOUT_MS, ctrl.signal);
        if (ctrl.signal.aborted) return;
        detailCache.set(id, data);
        setState({ data, loading: false, error: null });
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setState({
          data: null,
          loading: false,
          error: e,
        });
      }
    })();

    return () => ctrl.abort();
  }, [id, attempt]);

  return { ...state, reload };
}
