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
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.saved() });
    },
  });
}
