'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import type {
  ComposeLetterInput,
  LetterEntitlement,
  LetterLengthLimit,
  CreateCheckoutInput,
  ListPlansResponse,
  ListPublicProfilesQuery,
  ListPublicProfilesResponse,
  MailboxThreadDetail,
  MailboxThreadSummary,
  MySubscription,
  OutsideUserProfile,
  PublicProfileDetail,
  RecordSwipeResponse,
  ReportReason,
  SwipeAction,
  UpdateOutsideProfileInput,
  BlockedProfile,
  ListResourcesQuery,
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
  subscription: () => ['subscription'] as const,
  plans: () => ['plans'] as const,
  blocks: () => ['blocks'] as const,
  resources: (query: ListResourcesQuery) => ['resources', query] as const,
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
    // A 404 here means the listing is no longer public, which no amount of
    // asking again will change. Retrying it three times only delays the notice
    // the mailbox shows in its place; everything else keeps the usual retries.
    retry: (attempt, error) =>
      (error as { status?: number } | null)?.status === 404 ? false : attempt < 3,
  });
}

export function useMyProfile() {
  const factory = useApiFactory();
  return useQuery({
    queryKey: qk.myProfile(),
    queryFn: async () => (await factory()).getMyProfile() as Promise<OutsideUserProfile>,
  });
}

/**
 * Onboarding writes.
 *
 * Every one of these returns the whole updated profile, so they seed the
 * `myProfile` cache with the response rather than invalidating and refetching —
 * onboarding saves a draft on each of nine steps, and a refetch per step is a
 * visible stall between questions.
 */
export function useUpdateMyProfile() {
  const factory = useApiFactory();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateOutsideProfileInput) =>
      (await factory()).updateMyProfile(input),
    onSuccess: (profile) => queryClient.setQueryData(qk.myProfile(), profile),
  });
}

export function useSubmitMyProfile() {
  const factory = useApiFactory();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => (await factory()).submitMyProfile(),
    onSuccess: (profile) => queryClient.setQueryData(qk.myProfile(), profile),
  });
}

export function useUploadMyProfilePhoto() {
  const factory = useApiFactory();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) =>
      (await factory()).uploadMyProfilePhoto(file, file.name),
    onSuccess: (profile) => {
      queryClient.setQueryData(qk.myProfile(), profile);
      // And ask again. The response is authoritative for the photo, but the
      // upload also returns the profile to draft for moderation, and anything
      // else reading it should see that without a reload.
      void queryClient.invalidateQueries({ queryKey: qk.myProfile() });
    },
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

/**
 * Pull an open thread again.
 *
 * Wanted when the thread list reports post the reading pane has not fetched:
 * the pane holds a minute-old copy, and clearing the unread badge over stale
 * contents would retire a letter the member was never shown.
 */
export function useRefreshThread() {
  const queryClient = useQueryClient();
  return useCallback(
    (threadId: string) => {
      void queryClient.invalidateQueries({ queryKey: qk.thread(threadId) });
    },
    [queryClient],
  );
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

export function useBlocks() {
  const factory = useApiFactory();
  return useQuery({
    queryKey: qk.blocks(),
    queryFn: async () => (await factory()).listBlocks(),
  });
}

/**
 * Undo a block.
 *
 * The row is dropped from the cached list on success rather than by refetching:
 * unblocking is a correction of a mistake, and watching the name sit there for
 * another round trip reads as though it did not work.
 */
export function useUnblockProfile() {
  const factory = useApiFactory();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: string) => (await factory()).unblockProfile(profileId),
    onSuccess: (_result, profileId) => {
      queryClient.setQueryData(
        qk.blocks(),
        (old: { items: BlockedProfile[]; total: number } | undefined) =>
          old
            ? {
                ...old,
                items: old.items.filter((b) => b.profileId !== profileId),
                total: Math.max(0, old.total - 1),
              }
            : old,
      );
      // The profile becomes visible again everywhere it was hidden.
      void queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}

/**
 * The resources directory.
 *
 * Categories come back with every response, so the filter chips and the list
 * are one request rather than two that can disagree about which categories
 * exist.
 */
export function useResources(query: ListResourcesQuery = {}) {
  const factory = useApiFactory();
  return useQuery({
    queryKey: qk.resources(query),
    queryFn: async () => (await factory()).listResources(query),
    // The directory is editorial content that changes rarely; refetching it on
    // every chip press would flash the list for nothing.
    staleTime: 5 * 60 * 1000,
  });
}

export function useReportProfile() {
  const factory = useApiFactory();
  return useMutation({
    mutationFn: async ({ profileId, reason }: { profileId: string; reason: ReportReason }) =>
      (await factory()).reportProfile(profileId, { reason }),
  });
}

/** The plan this member is on, if any. */
export function useSubscription() {
  const factory = useApiFactory();
  return useQuery({
    queryKey: qk.subscription(),
    queryFn: async () => (await factory()).getMySubscription() as Promise<MySubscription>,
  });
}

/**
 * The plan catalogue.
 *
 * Two distinct sets come back and showing the wrong one sells the wrong thing:
 * `inmate_listing` plans pay to put someone's profile live and belong only in
 * the sponsor flow, while a member looking at their own account is buying
 * their own subscription. `forProfileId` is what separates the two.
 */
/**
 * The plan catalogue.
 *
 * Arriving with a profile means sponsoring that person, so only the listing
 * plans apply and the rest would be noise. Without one, everything is returned:
 * hiding the listing plans made the page look like the product sold two things,
 * when the listing tiers are most of what it sells. The page groups them and
 * sends the listing tiers through the sponsor flow, because a listing plan
 * bought with nobody attached is a subscription that lists no one.
 */
export function usePlans(forProfileId?: string) {
  const factory = useApiFactory();
  const wantListing = Boolean(forProfileId);
  return useQuery({
    queryKey: [...qk.plans(), wantListing] as const,
    queryFn: async () => (await factory()).listPlans() as Promise<ListPlansResponse>,
    select: (data) =>
      wantListing ? data.plans.filter((plan) => plan.type === 'inmate_listing') : data.plans,
    // The catalogue is the same for everyone and changes when someone edits it
    // in admin, not while a member is deciding.
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateCheckout() {
  const factory = useApiFactory();
  return useMutation({
    mutationFn: async (input: CreateCheckoutInput) =>
      (await factory()).createSubscriptionCheckout(input),
  });
}

/**
 * Stop the plan renewing.
 *
 * The period already paid for is kept, so the response says when access
 * actually ends — which is not now, and the screen has to say so.
 */
export function useCancelSubscription() {
  const factory = useApiFactory();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await factory()).cancelMySubscription(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.subscription() });
    },
  });
}

/** Irreversible: removes the sign-in and scrubs personal details. */
export function useDeleteAccount() {
  const factory = useApiFactory();
  return useMutation({
    mutationFn: async () => (await factory()).deleteAccount(),
  });
}

/**
 * Record a deck action.
 *
 * The server persists it so the browse query stops returning that profile —
 * which is also why Second Look is a `second_look` action rather than a purely
 * local undo: it removes the row, so the person comes back on the next fetch
 * for every device, not just this one.
 */
export function useRecordSwipe() {
  const factory = useApiFactory();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: SwipeAction }) =>
      (await factory()).recordSwipe(id, action) as Promise<RecordSwipeResponse>,
    onSuccess: (_result, { action }) => {
      // A like lands in Liked, and a second look changes what browse returns.
      if (action === 'like') void queryClient.invalidateQueries({ queryKey: qk.saved() });
      if (action === 'second_look') void queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}
