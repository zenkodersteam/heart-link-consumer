import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Labelled text input and textarea, mirroring the phone app's `Field`
 * primitive so a form reads the same on both surfaces.
 *
 * The label is a real `<label>` bound by id rather than a styled `<span>`:
 * these are the first fields a new member ever fills in, and tapping the label
 * to focus the input is behaviour people expect without being told.
 */

const fieldStyles =
  'w-full rounded-[14px] border border-line bg-surface-elevated px-4 text-[15px] text-ink ' +
  'placeholder:text-ink-faint transition-colors ' +
  'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

function FieldShell({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-soft">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  className,
  id,
  ...props
}: React.ComponentProps<'input'> & { label: string; hint?: string; error?: string }) {
  const generated = React.useId();
  const fieldId = id ?? generated;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fieldId}>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        className={cn(fieldStyles, 'h-12', className)}
        {...props}
      />
    </FieldShell>
  );
}

export function TextareaField({
  label,
  hint,
  error,
  className,
  id,
  ...props
}: React.ComponentProps<'textarea'> & { label: string; hint?: string; error?: string }) {
  const generated = React.useId();
  const fieldId = id ?? generated;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fieldId}>
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        className={cn(fieldStyles, 'resize-y py-3 leading-relaxed', className)}
        {...props}
      />
    </FieldShell>
  );
}
