import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useState } from 'react';

import type { OutsideUserProfile } from '@heartlink/consumer-api';
import { useApiClientFactory } from './use-api-client';

/**
 * The signed-in user's own outside profile, shared across screens via a
 * module-level cache so the tabs gate + account + mailbox don't each refetch.
 * `refresh()` bypasses the cache (call after a PUT/submit).
 */
let cached: OutsideUserProfile | null = null;
let inflight: Promise<OutsideUserProfile> | null = null;
/**
 * Clerk id the cache belongs to. The cache is module-level, so without this it
 * outlives the session: sign out, sign in as someone else, and the new member
 * gets the previous one's profile — visibly, as prefilled onboarding answers.
 */
let cachedUserId: string | null = null;
const listeners = new Set<(p: OutsideUserProfile) => void>();

/** Drop the shared profile. Call on sign-out and whenever the user changes. */
export function clearMyProfileCache() {
  cached = null;
  inflight = null;
  cachedUserId = null;
}

function publish(p: OutsideUserProfile) {
  cached = p;
  listeners.forEach((l) => l(p));
}

/**
 * True once the user has completed onboarding. Keyed on the server's durable
 * `onboardingComplete` latch (set on first profile submit), NOT on live profile
 * fields or `status`: the previous version required all fields AND
 * `status !== 'draft'`, so any profile edit (which resets status to draft) sent
 * the member back through onboarding on their next login.
 */
export function isOnboarded(p: OutsideUserProfile | null): boolean {
  return Boolean(p?.onboardingComplete);
}

export function useMyProfile() {
  const { isSignedIn, userId } = useAuth();
  const apiFactory = useApiClientFactory();
  const [profile, setProfile] = useState<OutsideUserProfile | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (force = false) => {
      if (!isSignedIn) {
        setLoading(false);
        return;
      }
      // A different member is signed in than the one the cache was filled for.
      if (userId && cachedUserId && cachedUserId !== userId) {
        clearMyProfileCache();
        setProfile(null);
      }
      cachedUserId = userId ?? null;
      if (cached && !force) {
        setProfile(cached);
        setLoading(false);
        return;
      }
      setLoading(!cached);
      setError(null);
      try {
        if (!inflight || force) {
          inflight = apiFactory().then((api) => api.getMyProfile());
        }
        const p = await inflight;
        inflight = null;
        publish(p);
      } catch (e) {
        inflight = null;
        setError(e instanceof Error ? e.message : 'Could not load your profile.');
      } finally {
        setLoading(false);
      }
    },
    [apiFactory, isSignedIn, userId],
  );

  useEffect(() => {
    listeners.add(setProfile);
    void load();
    return () => {
      listeners.delete(setProfile);
    };
  }, [load]);

  return {
    profile,
    loading,
    error,
    refresh: () => load(true),
    /** Push a server response (from PUT/submit) into the shared cache. */
    apply: publish,
  };
}
