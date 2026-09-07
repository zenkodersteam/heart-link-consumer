'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  CreditCard,
  Info,
  LifeBuoy,
  LogOut,
  MessageCircle,
  Send,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { useSession } from '@/components/auth/session-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import {
  useDeleteAccount,
  useLetterEntitlement,
  useMyProfile,
  useSubscription,
} from '@/lib/queries';

import { SettingsCard, SettingsGroupLabel, SettingsRow } from './settings-row';

const PROFILE_STATUS_LABELS: Record<string, string> = {
  approved: 'Approved',
  pending: 'In review',
  rejected: 'Needs changes',
};

export function Account() {
  const params = useSearchParams();
  const checkout = params.get('checkout');

  const { user, signOut } = useSession();
  const queryClient = useQueryClient();

  const { data: profile } = useMyProfile();
  const { data: entitlement } = useLetterEntitlement();
  const { data: subscription, isPending: subscriptionPending } = useSubscription();
  const deleteAccount = useDeleteAccount();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const email = user?.email ?? '—';
  const initial = (profile?.displayName?.[0] ?? email[0] ?? '?').toUpperCase();

  const lettersLabel =
    entitlement === undefined
      ? undefined
      : entitlement.totalRemaining === null
        ? 'Unlimited letters'
        : `${entitlement.totalRemaining} ${entitlement.totalRemaining === 1 ? 'letter' : 'letters'} left`;

  const profileStatus = profile ? (PROFILE_STATUS_LABELS[profile.status] ?? 'Incomplete') : undefined;

  /**
   * Sign out, and drop everything cached for this member.
   *
   * The query cache outlives the session, so without clearing it the next
   * person to sign in on this browser would see the previous member's
   * profiles and letters until each query happened to refetch.
   */
  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      queryClient.clear();
    } finally {
      setSigningOut(false);
    }
  };

  const onDelete = () => {
    setDeleteError(null);
    deleteAccount.mutate(undefined, {
      onSuccess: async () => {
        queryClient.clear();
        await signOut();
      },
      onError: (err) =>
        setDeleteError(
          err instanceof Error ? err.message : 'Please try again, or contact support.',
        ),
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      {checkout === 'success' ? (
        <Banner tone="success" icon={CheckCircle2}>
          Thank you. Your payment is processing — your plan turns on as soon as it settles,
          usually within a minute.
        </Banner>
      ) : null}
      {checkout === 'cancel' ? (
        <Banner tone="neutral" icon={Info}>
          Checkout was cancelled. You have not been charged.
        </Banner>
      ) : null}

      <header className="mb-7 flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-sidebar font-[family-name:var(--font-bree)] text-xl text-sidebar-text ring-2 ring-gold-bright/60 ring-offset-2 ring-offset-surface">
          {initial}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-[family-name:var(--font-bree)] text-2xl text-ink">
            {profile?.displayName || 'Your account'}
          </h1>
          <p className="truncate text-sm text-ink-soft">{email}</p>
        </div>
      </header>

      <SettingsCard>
        <SettingsRow icon={Send} label="Letters" value={lettersLabel} href="/mailbox" />
        {/* Only send people back into the sign-up questions when there is
            something left to answer. An approved profile landing on step 1 of 9
            reads as though the approval did not count. */}
        <SettingsRow
          icon={User}
          label={
            profile?.status === 'approved'
              ? 'Your profile'
              : profile?.status === 'rejected'
                ? 'Fix and resubmit your profile'
                : 'Finish your profile'
          }
          value={profileStatus}
          href={profile?.status === 'approved' ? '/edit-profile' : '/onboarding'}
        />
        <SettingsRow
          icon={CreditCard}
          label="Plan"
          value={
            subscriptionPending
              ? '…'
              : subscription?.active
                ? (subscription.planName ?? 'Active')
                : 'No active plan'
          }
          href="/plans"
          last
        />
      </SettingsCard>

      <SettingsGroupLabel>Settings</SettingsGroupLabel>
      <SettingsCard>
        <SettingsRow icon={Shield} label="Privacy & safety" href="/privacy-safety" />
        <SettingsRow icon={LifeBuoy} label="Support" href="/support" />
        <SettingsRow icon={MessageCircle} label="Support Circle" href="/circle" last />
      </SettingsCard>

      <SettingsGroupLabel>Account</SettingsGroupLabel>
      <SettingsCard>
        <SettingsRow
          icon={LogOut}
          label={signingOut ? 'Signing out…' : 'Sign out'}
          onClick={() => void onSignOut()}
        />
        <SettingsRow
          icon={Trash2}
          label="Delete account"
          danger
          onClick={() => setConfirmDelete(true)}
          last
        />
      </SettingsCard>

      {deleteError ? <p className="mt-3 px-1 text-[13px] text-danger">{deleteError}</p> : null}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            Your sign-in is removed and your personal details are erased. Records of payments are
            kept, as we are required to. This cannot be undone.
          </DialogDescription>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="secondary"
              className="sm:flex-1"
              onClick={() => setConfirmDelete(false)}
              disabled={deleteAccount.isPending}
            >
              Keep my account
            </Button>
            <Button
              variant="danger"
              className="sm:flex-1"
              onClick={onDelete}
              disabled={deleteAccount.isPending}
            >
              {deleteAccount.isPending ? (
                <Spinner size="sm" className="border-white/40 border-t-white" />
              ) : null}
              Delete my account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Banner({
  tone,
  icon: Icon,
  children,
}: {
  tone: 'success' | 'neutral';
  icon: typeof Info;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        tone === 'success'
          ? 'mb-6 flex gap-2.5 rounded-2xl border border-success bg-success/10 p-4'
          : 'mb-6 flex gap-2.5 rounded-2xl border border-line bg-surface-muted p-4'
      }
    >
      <Icon
        className={tone === 'success' ? 'mt-0.5 size-4 shrink-0 text-success' : 'mt-0.5 size-4 shrink-0 text-ink-soft'}
      />
      <p className="text-[13px] leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}
