'use client';

import { OTPInput, OTPInputContext, REGEXP_ONLY_DIGITS } from 'input-otp';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Six separate-looking boxes that are really one input.
 *
 * That distinction is the whole reason for the library. Six actual inputs is
 * the obvious way to build this and it behaves badly everywhere it matters:
 * paste drops five of the six digits, backspace at the start of a box does
 * nothing, autofill from the SMS/email suggestion fills only the first, and a
 * screen reader announces six unlabelled fields. Here there is one real input
 * with the caret and the value, and the boxes are drawn from its state — so
 * paste, autofill, arrow keys and select-all are the browser's own.
 */
const InputOtp = React.forwardRef<
  React.ComponentRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    ref={ref}
    containerClassName={cn(
      'flex items-center justify-center gap-2 has-disabled:opacity-50',
      containerClassName,
    )}
    className={cn('disabled:cursor-not-allowed', className)}
    {...props}
  />
));
InputOtp.displayName = 'InputOtp';

function InputOtpGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex items-center gap-2', className)} {...props} />;
}

/**
 * One box. `invalid` is passed down rather than read from a form library so the
 * whole row can turn red when a code is refused, which is the moment the colour
 * is actually worth spending.
 */
function InputOtpSlot({
  index,
  invalid,
  className,
  ...props
}: React.ComponentProps<'div'> & { index: number; invalid?: boolean }) {
  const context = React.useContext(OTPInputContext);
  const slot = context.slots[index];

  return (
    <div
      className={cn(
        'relative flex h-14 w-11 items-center justify-center rounded-xl border bg-surface-elevated',
        'font-[family-name:var(--font-bree)] text-2xl text-ink transition-all',
        invalid ? 'border-danger' : 'border-line',
        slot?.isActive && !invalid && 'z-10 border-primary ring-2 ring-primary/25',
        className,
      )}
      {...props}
    >
      {slot?.char}
      {/* A caret of our own: the real input is transparent and offscreen, so
          without this the active box looks frozen while you type. */}
      {slot?.hasFakeCaret ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-7 w-px animate-caret-blink bg-ink duration-1000" />
        </div>
      ) : null}
    </div>
  );
}

/**
 * What the field will accept, as a whole-string regex.
 *
 * Not an HTML `pattern` attribute: this component takes its own, tests the
 * entire value against it, and refuses anything that fails. An unanchored
 * `[0-9]*` passes every string there is — including a pasted sentence — which
 * is the same as having no rule at all.
 */
const ONLY_DIGITS = REGEXP_ONLY_DIGITS;

export { InputOtp, InputOtpGroup, InputOtpSlot, ONLY_DIGITS };
