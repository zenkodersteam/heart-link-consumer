'use client';

import { Eye, EyeOff, Lock } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Show/hide for a password box.
 *
 * A typed password is easy to get wrong and impossible to check, which matters
 * most when setting one. The state is never remembered between visits: leaving
 * a password on screen is a decision to take each time, not one to inherit.
 *
 * Lives here rather than beside the sign-in form because four screens now have
 * password boxes, and a reveal that exists on some of them is the bug people
 * report.
 */
export function RevealButton({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? 'Hide password' : 'Show password'}
      aria-pressed={shown}
      className="grid size-8 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
    >
      {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[13px] text-danger">
      {message}
    </p>
  );
}

/**
 * A labelled password box with its own reveal.
 *
 * Its own, deliberately: sharing one toggle across a password and its
 * confirmation means revealing the thing you are checking against, which is
 * the opposite of what checking it is for.
 */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  shown,
  onToggleShown,
  error,
  placeholder,
  autoComplete,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  shown: boolean;
  onToggleShown: () => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-[11px] font-bold uppercase tracking-[1.2px] text-ink-faint"
      >
        {label}
      </label>
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-2xl border bg-surface-elevated px-4 transition-colors',
          error ? 'border-danger' : 'border-line focus-within:border-primary',
        )}
      >
        <Lock className="size-4 shrink-0 text-ink-faint" />
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          value={value}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-ink outline-none placeholder:text-ink-soft"
        />
        <RevealButton shown={shown} onToggle={onToggleShown} />
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
