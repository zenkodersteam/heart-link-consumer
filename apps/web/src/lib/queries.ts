'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  ListPublicProfilesQuery,
  ListPublicProfilesResponse,
  MailboxThreadSummary,
  OutsideUserProfile,
  PublicProfileDetail,
} from '@heartlink/consumer-api';

import { useApiFactory } from '@/lib/api';

/**
 * Query keys in one place.
 *
 * Hand-written key arrays are how caches quietly stop invalidating — a mutation
 * spells a key one way, the query another, and the screen keeps showing stale
 * data. Building them from here means an invalidation cannot miss.
 */
export const qk = {
  profiles: (query: ListPublicProfilesQuery) => ['profiles', query] as const,
  profile: (id: string) => ['profile', id] as const,
  myProfile: () => ['my-profile'] as const,
  saved: () => ['saved-profiles'] as const,
  threads: () => ['mailbox', 'threads'] as const,
  thread: (id: string) => ['mailbox', 'thread', id] as const,
  entitlement: () => ['letter-entitlement'] as const,
};

export function usePublicProfiles(
  query: ListPublicProfilesQuery,
  options?: Partial<UseQueryOptions<ListPublicProfilesResponse>>,
) {
  const factory = useApiFactory();
  return useQuery({
    queryKey: qk.profiles(query),
    queryFn: async () => (await factory()).listPublicProfiles(query),
    ...options,
  });
}

export function usePublicProfile(id: string | undefined) {
  const factory = useApiFactory();
  return useQuery({
    queryKey: qk.profile(id ?? ''),
    queryFn: async () => (await factory()).getPublicProfile(id!) as Promise<PublicProfileDetail>,
    enabled: Boolean(id),
  });
}

export function useMyProfile() {
  const factory = useApiFactory();
  return useQuery({
    queryKey: qk.myProfile(),
    queryFn: async () => (await factory()).getMyProfile() as Promise<OutsideUserProfile>,
  });
}

export function useSavedProfiles() {
  const factory = useApiFactory();
  return useQuery({
    queryKey: qk.saved(),
    queryFn: async () => (await factory()).listSavedProfiles(),
  });
}

export function useMailboxThreads() {
  const factory = useApiFactory();
  return useQuery({
    queryKey: qk.threads(),
    queryFn: async () =>
      (await factory()).listMailboxThreads() as Promise<{ items: MailboxThreadSummary[] }>,
  });
}

/**
 * Save/unsave, with the button reflecting the tap immediately.
 *
 * Waiting for the round trip makes a heart feel broken on a slow connection, so
 * the cache is updated first and rolled back if the request fails.
 */
export function useToggleSaved() {
  const factory = useApiFactory();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, saved }: { id: string; saved: boolean }) => {
      const api = await factory();
      return saved ? api.unsaveProfile(id) : api.saveProfile(id);
    },
    // Flip the cache first so the heart responds to the tap, then reconcile.
    // Waiting on the round trip makes it feel broken on a slow connection.
    onMutate: async ({ id, saved }) => {
      await queryClient.cancelQueries({ queryKey: qk.saved() });
      const previous = queryClient.getQueryData(qk.saved());
      queryClient.setQueryData(qk.saved(), (old: { items: { id: string }[] } | undefined) => {
        if (!old) return old;
        return saved
          ? { ...old, items: old.items.filter((p) => p.id !== id) }
          : old;
      });
      return { previous };
    },
    // Put the old list back if the request failed, or the UI keeps a change
    // the server never accepted.
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(qk.saved(), context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.saved() });
    },
  });
}
