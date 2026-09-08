'use client';

import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Staff sign-in: an address and a password, and nothing else.
 *
 * No sign-up and no link to one — staff accounts are created by an
 * administrator, so the only thing this form can do is open a door that already
 * exists. No emailed code either: the console is a staff tool on a shared
 * network, and one door is easier to reason about than two.
 *
 * A member of staff who has no password yet cannot get in here at all. That is
 * deliberate, and it is why `grant-admin` sets one when the account is created.
 */
function failureMessage(status: number, message: string | undefined, fallback: string): string {
  // The API is deliberately vague about whether an address is known, and that
  // wording is used as-is. A 5xx has no such wording, only the framework's
  // "Internal server error", which tells someone nothing and reads as though
  // they did something wrong.
  if (status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
  return message ?? fallback;
}

const BOUNCE_REASONS: Record<string, string> = {
  not_authorized: 'That account does not have staff access. Ask an administrator to grant it.',
  session_expired: 'Your session has ended. Sign in again to pick up where you left off.',
};

export function AdminSignInForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordShown, setPasswordShown] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);

  // Carried over from a bounce, so someone sent here by an expired session is
  // told why rather than left guessing.
  const bounce = params.get('reason');
  const redirectTo = params.get('redirect_url') ?? '/dashboard';

  function fail(message: string) {
    setInvalid(true);
    toast.error(message);
  }

  async function signIn() {
    setBusy(true);
    setInvalid(false);
    try {
      const response = await fetch('/api/auth/password/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        fail(failureMessage(response.status, data.message, 'That email or password is not right.'));
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      fail('We could not reach the API. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="hl-auth__form-card"
      onSubmit={(event) => {
        event.preventDefault();
        void signIn();
      }}
    >
      {bounce ? <p className="hl-auth__notice">{BOUNCE_REASONS[bounce] ?? BOUNCE_REASONS.session_expired}</p> : null}

      <div className="hl-auth__field">
        <label htmlFor="email" className="hl-auth__label">
          Work email
        </label>
        <div className={`hl-auth__control${invalid ? ' hl-auth__control--invalid' : ''}`}>
          <Mail className="hl-auth__control-icon" aria-hidden />
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setInvalid(false);
            }}
            autoComplete="username"
            placeholder="you@heartlink.app"
          />
        </div>
      </div>

      <div className="hl-auth__field">
        <label htmlFor="password" className="hl-auth__label">
          Password
        </label>
        <div className={`hl-auth__control${invalid ? ' hl-auth__control--invalid' : ''}`}>
          <Lock className="hl-auth__control-icon" aria-hidden />
          <input
            id="password"
            type={passwordShown ? 'text' : 'password'}
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setInvalid(false);
            }}
            autoComplete="current-password"
            placeholder="Your password"
          />
          {/* Staff type these on shared screens, so it starts hidden and is
              never remembered between visits. */}
          <button
            type="button"
            onClick={() => setPasswordShown((shown) => !shown)}
            aria-label={passwordShown ? 'Hide password' : 'Show password'}
            aria-pressed={passwordShown}
            className="hl-auth__reveal"
          >
            {passwordShown ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </button>
        </div>
      </div>

      <button type="submit" disabled={busy || !email.trim() || !password} className="hl-auth__submit">
        {busy ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="hl-auth__help">
        No password yet? Ask an administrator to set one for your account.
      </p>
    </form>
  );
}
