'use client';

import { Toaster as SonnerToaster } from 'sonner';

/**
 * Toasts, in the brand rather than sonner's own palette.
 *
 * `richColors` is deliberately off: it paints success green and error red on
 * saturated backgrounds, which is a different product's voice. These sit on the
 * same warm paper as every other surface and carry a coloured left edge, so the
 * kind of message reads before the words do — the same treatment the phone app
 * uses, so the two feel like one product.
 *
 * The edge is a border rather than colour alone: an icon and a stripe survive
 * being unable to tell the two colours apart, and a tint on its own does not.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      // Long enough to read a sentence explaining what to do next. Sonner's
      // default is comfortable for "Saved" and too short for anything else.
      duration={5000}
      toastOptions={{
        classNames: {
          toast:
            'group !bg-surface-elevated !border !border-line !border-l-4 !rounded-[14px] ' +
            '!shadow-[0_12px_32px_rgba(46,18,64,0.18)] !font-sans !items-start !gap-3',
          title: '!text-ink !text-[14px] !font-semibold !leading-snug',
          description: '!text-ink-soft !text-[13px] !leading-relaxed',
          actionButton: '!bg-primary !text-on-primary !rounded-[--radius-pill] !text-[12px]',
          cancelButton: '!bg-surface-muted !text-ink-soft !rounded-[--radius-pill] !text-[12px]',
          closeButton: '!bg-surface-elevated !border-line !text-ink-faint',
          success: '!border-l-success [&_[data-icon]]:!text-success',
          error: '!border-l-danger [&_[data-icon]]:!text-danger',
          info: '!border-l-gold [&_[data-icon]]:!text-gold',
          warning: '!border-l-gold [&_[data-icon]]:!text-gold',
        },
      }}
    />
  );
}
