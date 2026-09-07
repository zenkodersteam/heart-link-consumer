'use client';

import type { AuthUser } from '@heartlink/consumer-api';
import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AFTER_SIGN_IN, AFTER_SIGN_UP } from '@/lib/routes';
import { cn } from '@/lib/utils';

import { useSession } from './session-provider';

type Step = 'email' | 'code';

/**
 * Sign in, or sign up — the same two steps either way.
 *
 * `intent` changes this screen's wording and nothing else. Holding the address
 * is the whole of what either one proves, so the server decides from its own
 * records whether a code opens an account, creates one, or confirms an address
 * that has never been confirmed. Someone who clicks the wrong link still ends
 * up in the right place.
 */
export function OtpForm({ intent }: { intent: 'sign_in' | 'sign_up' }) {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useSession();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [expiresInMinutes, setExpiresInMinutes] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resentAt, setResentAt] = useState<number | null>(null);

  const codeInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (step === 'code') codeInput.current?.focus();
  }, [step]);

  const redirectTo = params.get('redirect_url');

  async function sendCode(resend = false) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { message?: string; expiresInMinutes?: number };
      if (!response.ok) {
        setError(data.message ?? 'We could not send a code. Please try again.');
        return;
      }
      setExpiresInMinutes(data.expiresInMinutes ?? 10);
      setStep('code');
      if (resend) setResentAt(Date.now());
    } catch {
      setError('We could not reach HeartLink. Check your connection and try again.');
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
      const data = (await response.json()) as {
        message?: string;
        user?: AuthUser;
        created?: boolean;
      };
      if (!response.ok) {
        setError(data.message ?? 'That code is not right, or it has expired.');
        // The code is spent either way; clearing it saves someone editing a
        // dead one digit at a time.
        setCode('');
        codeInput.current?.focus();
        return;
      }

      setUser(data.user ?? null);
      // A brand-new account has a profile to fill in before anything else
      // expects one; an existing one goes where they were headed.
      const destination = data.created ? AFTER_SIGN_UP : (redirectTo ?? AFTER_SIGN_IN);
      router.push(destination);
      // The signed-in layout is a server component and would otherwise still
      // be rendering the anonymous version from cache.
      router.refresh();
    } catch {
      setError('We could not reach HeartLink. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'code') {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setStep('email');
            setCode('');
            setError(null);
          }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Use a different address
        </button>

        <h1 className="mt-5 font-[family-name:var(--font-bree)] text-2xl text-ink">
          Check your email
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          We sent a {String(expiresInMinutes)}-minute code to{' '}
          <span className="font-semibold text-ink">{email}</span>.
        </p>

        <form
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (code.trim().length === 6) void verify(code);
          }}
        >
          <label htmlFor="code" className="sr-only">
            Your six-digit code
          </label>
          <input
            ref={codeInput}
            id="code"
            value={code}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(digits);
              // Submitted on the sixth digit: it saves a deliberate press for
              // the one thing everybody does next. The value is passed rather
              // than read back from state, which has not updated yet.
              if (digits.length === 6) void verify(digits);
            }}
            // A numeric keypad on a phone, and the code filled straight from
            // the notification on iOS and Android.
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            placeholder="••••••"
            aria-invalid={error ? true : undefined}
            className={cn(
              'w-full rounded-2xl border bg-surface-elevated px-4 py-4 text-center font-[family-name:var(--font-bree)] text-3xl tracking-[0.4em] text-ink outline-none transition-colors placeholder:text-ink-faint/50',
              error ? 'border-danger' : 'border-line focus:border-primary',
            )}
          />

          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

          <Button type="submit" className="mt-5 w-full" disabled={busy || code.length < 6}>
            {busy ? <Spinner size="sm" className="border-white/40 border-t-white" /> : null}
            Continue
          </Button>
        </form>

        <p className="mt-5 text-center text-[13px] text-ink-soft">
          {resentAt ? (
            'Sent again — it can take a moment to arrive.'
          ) : (
            <>
              Didn&apos;t get it?{' '}
              <button
                type="button"
                onClick={() => void sendCode(true)}
                disabled={busy}
                className="font-semibold text-primary hover:underline disabled:opacity-50"
              >
                Send another
              </button>
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-[family-name:var(--font-bree)] text-2xl text-ink">
        {intent === 'sign_up' ? 'Create your account' : 'Welcome back'}
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
        {intent === 'sign_up'
          ? 'Enter your email and we will send you a code. No password to remember.'
          : 'Enter your email and we will send you a code to sign in.'}
      </p>

      <form
        className="mt-6"
        onSubmit={(event) => {
          event.preventDefault();
          void sendCode();
        }}
      >
        <label
          htmlFor="email"
          className="mb-2 block text-[11px] font-bold uppercase tracking-[1.2px] text-ink-faint"
        >
          Email address
        </label>
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-2xl border bg-surface-elevated px-4 transition-colors',
            error ? 'border-danger' : 'border-line focus-within:border-primary',
          )}
        >
          <Mail className="size-4 shrink-0 text-ink-faint" />
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-faint"
          />
        </div>

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

        <Button type="submit" className="mt-5 w-full" disabled={busy || !email.trim()}>
          {busy ? <Spinner size="sm" className="border-white/40 border-t-white" /> : null}
          Continue
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        {intent === 'sign_up' ? (
          <>
            Already have an account?{' '}
            <Link href="/sign-in" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{' '}
            <Link href="/sign-up" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-ink-faint">
        By continuing you agree to our{' '}
        <Link href="/policy?doc=terms" className="underline">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/policy?doc=privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
