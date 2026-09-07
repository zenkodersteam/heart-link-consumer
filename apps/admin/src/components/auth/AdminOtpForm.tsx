'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { AdminOtpBoxes } from './AdminOtpBoxes';

/**
 * Staff sign-in: an address, then the code emailed to it.
 *
 * There is no sign-up here and no link to one. Staff accounts are created by a
 * seed script or by an existing admin, so the only thing this form can do is
 * open a door that already exists.
 */
/**
 * What to show when a request fails.
 *
 * The API's own wording is used where it wrote one deliberately — it is careful
 * about not saying whether a code was wrong, expired or never existed. A 5xx
 * has no such wording, only the framework's "Internal server error", which
 * tells someone nothing and reads as though they did something wrong.
 */
function failureMessage(status: number, message: string | undefined, fallback: string): string {
  if (status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
  return message ?? fallback;
}

export function AdminOtpForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Carried over from a bounce, so someone sent here by an expired session is
  // told why rather than left guessing.
  const reason = params.get('reason');
  const redirectTo = params.get('redirect_url') ?? '/dashboard';

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(failureMessage(response.status, data.message, 'We could not send a code. Please try again.'));
        return;
      }
      setStep('code');
    } catch {
      setError('We could not reach the API. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function verify(value: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: value }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(
          failureMessage(response.status, data.message, 'That code is not right, or it has expired.'),
        );
        // The code is spent either way; clearing it saves editing a dead one.
        setCode('');
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('We could not reach the API. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hl-auth__form">
      {reason === 'not_authorized' ? (
        <p className="hl-auth__notice">
          That account is not set up as a staff member. Ask an administrator to grant it access,
          then sign in again.
        </p>
      ) : null}

      {step === 'email' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendCode();
          }}
        >
          <label htmlFor="email" className="hl-auth__label">
            Work email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@heartlink.app"
            className="hl-auth__input"
          />
          {error ? <p className="hl-auth__error">{error}</p> : null}
          <button type="submit" disabled={busy || !email.trim()} className="hl-auth__submit">
            {busy ? 'Sending…' : 'Send me a code'}
          </button>
        </form>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (code.length === 6) void verify(code);
          }}
        >
          <p className="hl-auth__sent">
            We sent a code to <strong>{email}</strong>.
          </p>
          <span className="hl-auth__label">Your code</span>
          <AdminOtpBoxes
            value={code}
            disabled={busy}
            invalid={Boolean(error)}
            onChange={(digits) => {
              setCode(digits);
              // Submitted on the sixth digit. The value is passed rather than
              // read back from state, which has not updated yet.
              if (digits.length === 6) void verify(digits);
            }}
          />
          {error ? <p className="hl-auth__error">{error}</p> : null}
          <button type="submit" disabled={busy || code.length < 6} className="hl-auth__submit">
            {busy ? 'Checking…' : 'Continue'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setCode('');
              setError(null);
            }}
            className="hl-auth__link"
          >
            Use a different address
          </button>
        </form>
      )}
    </div>
  );
}
