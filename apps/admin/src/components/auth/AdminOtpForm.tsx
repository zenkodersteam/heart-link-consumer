'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Staff sign-in: an address, then the code emailed to it.
 *
 * There is no sign-up here and no link to one. Staff accounts are created by a
 * seed script or by an existing admin, so the only thing this form can do is
 * open a door that already exists.
 */
export function AdminOtpForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const codeInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (step === 'code') codeInput.current?.focus();
  }, [step]);

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
        setError(data.message ?? 'We could not send a code. Please try again.');
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
        setError(data.message ?? 'That code is not right, or it has expired.');
        setCode('');
        codeInput.current?.focus();
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
          <label htmlFor="code" className="hl-auth__label">
            Your code
          </label>
          <input
            ref={codeInput}
            id="code"
            value={code}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(digits);
              // Submitted on the sixth digit. The value is passed rather than
              // read back from state, which has not updated yet.
              if (digits.length === 6) void verify(digits);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            className="hl-auth__input hl-auth__input--code"
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
