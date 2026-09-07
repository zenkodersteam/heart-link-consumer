import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Styled checkbox.
 *
 * The checkboxes in the app were bare `<input type="checkbox">` with no class
 * at all, so they rendered at the operating system's default size and colour
 * next to controls built from the brand palette. They were also the only
 * controls in a form with no focus ring.
 *
 * `accent-color` is used rather than a hand-built box: it recolours the native
 * control while keeping its behaviour, indeterminate state, and screen-reader
 * semantics intact. A checkbox drawn from scratch buys a marginally different
 * tick for a real loss in accessibility.
 */
export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={cn(
        'h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border border-border accent-primary',
        'transition-shadow duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Checkbox with its label, which is how every one of these is actually used.
 * Wrapping in a <label> makes the text a hit target too, so the 16px box stops
 * being the only place a person can click.
 */
export function CheckboxField({
  label,
  className,
  ...props
}: CheckboxProps & { label: React.ReactNode }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2 text-sm text-text',
        props.disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <Checkbox {...props} />
      <span>{label}</span>
    </label>
  );
}
