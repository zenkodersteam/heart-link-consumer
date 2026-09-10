'use client';

import { PASSWORD_MIN_LENGTH, passwordProblem } from '@heartlink/domain';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { PasswordField } from '@/components/auth/password-field';
import { useSession } from '@/components/auth/session-provider';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type FieldKey = 'currentPassword' | 'newPassword' | 'confirmPassword';

/**
 * Change the password from inside the account.
 *
 * Asks for the current one. A signed-in session is not enough on its own:
 * a borrowed laptop or a stolen token would otherwise be all it takes to lock
 * the owner out of their own account, and this is the one screen that can do
 * that. The forgot-password flow is the way through for anyone who genuinely
 * cannot supply it.
 *
 * Each box carries its own reveal, including the confirmation — sharing one
 * toggle would show the value being checked against, which is the opposite of
 * what typing it twice is for.
 */
export function ChangePassword() {
  const { getToken } = useSession();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [currentShown, setCurrentShown] = useState(false);
  const [newShown, setNewShown] = useState(false);
  const [confirmShown, setConfirmShown] = useState(false);

  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [busy, setBusy] = useState(false);

  function clearField(key: FieldKey) {
    setErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    // Checked here as well as on the server, so the three obvious mistakes are
    // answered without a round trip. The server still decides: it is the only
    // side that knows the current password.
    const found: Partial<Record<FieldKey, string>> = {};
    if (!currentPassword) found.currentPassword = 'Enter your current password.';
    const problem = passwordProblem(newPassword);
    if (problem) found.newPassword = problem;
    else if (newPassword === currentPassword) {
      found.newPassword = 'Choose a password you are not already using.';
    }
    if (confirmPassword !== newPassword) found.confirmPassword = 'Both passwords must match.';

    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setBusy(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/auth/password/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ?? ''}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        const message = data?.message ?? 'We could not change your password. Please try again.';
        // The server's one useful distinction, put back on the field it
        // belongs to rather than left as a banner over the whole form.
        if (/current password/i.test(message)) setErrors({ currentPassword: message });
        else if (/already using/i.test(message)) setErrors({ newPassword: message });
        else toast.error(message);
        return;
      }

      toast.success('Password changed', {
        description: 'Use your new password the next time you sign in.',
      });
      router.push('/account');
    } catch {
      toast.error('We could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-8">
      <h1 className="font-[family-name:var(--font-bree)] text-3xl text-ink">Change password</h1>
      <p className="mt-1.5 text-sm text-ink-soft">
        You stay signed in on this device. Anywhere else, use the new password.
      </p>

      {/* `noValidate`: the browser's own bubble fires before ours and says
          something we did not write, in wording we cannot fix. */}
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="mt-7 flex flex-col gap-4">
        <PasswordField
          id="current-password"
          label="Current password"
          value={currentPassword}
          onChange={(value) => {
            setCurrentPassword(value);
            clearField('currentPassword');
          }}
          shown={currentShown}
          onToggleShown={() => setCurrentShown((shown) => !shown)}
          error={errors.currentPassword}
          placeholder="The one you use now"
          autoComplete="current-password"
          autoFocus
        />

        <PasswordField
          id="new-password"
          label="New password"
          value={newPassword}
          onChange={(value) => {
            setNewPassword(value);
            clearField('newPassword');
          }}
          shown={newShown}
          onToggleShown={() => setNewShown((shown) => !shown)}
          error={errors.newPassword}
          placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
          autoComplete="new-password"
        />

        <PasswordField
          id="confirm-new-password"
          label="Confirm new password"
          value={confirmPassword}
          onChange={(value) => {
            setConfirmPassword(value);
            clearField('confirmPassword');
          }}
          shown={confirmShown}
          onToggleShown={() => setConfirmShown((shown) => !shown)}
          error={errors.confirmPassword}
          placeholder="Confirm password"
          autoComplete="new-password"
        />

        <Button type="submit" className="mt-2 w-full" disabled={busy}>
          {busy ? <Spinner size="sm" className="border-white/40 border-t-white" /> : null}
          Save new password
        </Button>

        <Button type="button" variant="secondary" onClick={() => router.push('/account')}>
          Cancel
        </Button>
      </form>
    </div>
  );
}
