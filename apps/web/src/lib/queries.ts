'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  ComposeLetterInput,
  LetterEntitlement,
  LetterLengthLimit,
  ListPublicProfilesQuery,
  ListPublicProfilesResponse,
  MailboxThreadDetail,
  MailboxThreadSummary,
  OutsideUserProfile,
  PublicProfileDetail,
  ReportReason,
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
  letterLimit: (profileId: string) => ['letter-limit', profileId] as const,
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

export function useMailboxThread(threadId: string | undefined) {
  const factory = useApiFactory();
  return useQuery({
    queryKey: qk.thread(threadId ?? ''),
    queryFn: async () =>
      (await factory()).getMailboxThread(threadId!) as Promise<MailboxThreadDetail>,
    enabled: Boolean(threadId),
  });
}

/**
 * How many letters are left this period.
 *
 * Kept fresh rather than cached for a minute like the rest: sending one spends
 * it, and a stale count here is the difference between "3 left" and a refusal.
 */
export function useLetterEntitlement() {
  const factory = useApiFactory();
  return useQuery({
    queryKey: qk.entitlement(),
    queryFn: async () => (await factory()).getLetterEntitlement() as Promise<LetterEntitlement>,
    staleTime: 0,
  });
}

/**
 * The recipient's word limit, so the composer can count as you type.
 *
 * Advisory: the server re-checks on send. Its job is to stop someone writing
 * four hundred words before learning the limit was two hundred.
 */
export function useLetterLimit(profileId: string | undefined) {
  const factory = useApiFactory();
  return useQuery({
    queryKey: qk.letterLimit(profileId ?? ''),
    queryFn: async () =>
      (await factory()).getLetterLimit(profileId!) as Promise<LetterLengthLimit>,
    enabled: Boolean(profileId),
    // The limit belongs to the recipient's plan and effectively never moves
    // mid-session; refetching it per keystroke-driven render would be waste.
    staleTime: 5 * 60 * 1000,
    // A missing limit is not an error worth surfacing — the counter simply
    // shows a plain word count instead.
    retry: false,
  });
}

/** Clears the unread badge. Fire-and-forget: a failure costs the member nothing. */
export function useMarkThreadRead() {
  const factory = useApiFactory();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threadId: string) => (await factory()).markMailboxThreadRead(threadId),
    onMutate: async (threadId) => {
      await queryClient.cancelQueries({ queryKey: qk.threads() });
      const previous = queryClient.getQueryData(qk.threads());
      queryClient.setQueryData(
        qk.threads(),
        (old: { items: MailboxThreadSummary[] } | undefined) =>
          old
            ? {
                ...old,
                items: old.items.map((t) =>
                  t.threadId === threadId ? { ...t, unreadCount: 0 } : t,
                ),
              }
            : old,
      );
      return { previous };
    },
    onError: (_err, _threadId, context) => {
      if (context?.previous) queryClient.setQueryData(qk.threads(), context.previous);
    },
  });
}

/**
 * Send a letter.
 *
 * The response carries the new entitlement, which is written straight into the
 * cache — asking for it again right after spending one would race the write on
 * the server and could hand back the old number.
 */
export function useComposeLetter() {
  const factory = useApiFactory();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileId, input }: { profileId: string; input: ComposeLetterInput }) =>
      (await factory()).composeLetter(profileId, input),
    onSuccess: (res, { profileId }) => {
      queryClient.setQueryData(qk.entitlement(), res.entitlement);
      void queryClient.invalidateQueries({ queryKey: qk.threads() });
      // The reply lands in whichever thread this profile owns; the id is not
      // known for a first letter, so refresh every open thread view.
      void queryClient.invalidateQueries({ queryKey: ['mailbox', 'thread'] });
      void queryClient.invalidateQueries({ queryKey: qk.profile(profileId) });
    },
  });
}

/** Hosted checkout for a letter top-up pack. */
export function usePurchaseLetters() {
  const factory = useApiFactory();
  return useMutation({
    mutationFn: async (pack: 'small' | 'medium' | 'large') => {
      const origin = window.location.origin;
      return (await factory()).purchaseLetters({
        pack,
        processor: 'stripe',
        successUrl: `${origin}/mailbox?purchase=success`,
        cancelUrl: `${origin}/mailbox?purchase=cancel`,
      });
    },
  });
}

/**
 * Blocking and reporting are deliberately separate.
 *
 * Someone may want a profile looked at without cutting contact, or want it gone
 * without accusing anyone — collapsing the two into one action forces a choice
 * neither of them asked for.
 */
export function useBlockProfile() {
  const factory = useApiFactory();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: string) => (await factory()).blockProfile(profileId),
    onSuccess: () => {
      // A blocked profile drops out of browse, Liked and the mailbox at once.
      void queryClient.invalidateQueries({ queryKey: ['profiles'] });
      void queryClient.invalidateQueries({ queryKey: qk.saved() });
      void queryClient.invalidateQueries({ queryKey: qk.threads() });
    },
  });
}

export function useReportProfile() {
  const factory = useApiFactory();
  return useMutation({
    mutationFn: async ({ profileId, reason }: { profileId: string; reason: ReportReason }) =>
      (await factory()).reportProfile(profileId, { reason }),
  });
}
