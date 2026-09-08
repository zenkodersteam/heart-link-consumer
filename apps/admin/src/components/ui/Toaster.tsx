'use client';

import { Toaster as SonnerToaster } from 'sonner';

/**
 * Toasts, in the brand rather than sonner's own palette.
 *
 * `richColors` is deliberately off: it paints success green and error red on
 * saturated backgrounds, which is a different product's voice. These sit on the
 * same warm paper as the rest of the console and carry a coloured left edge, so
 * the kind of message reads before the words do — the same treatment the member
 * apps use, so all three feel like one product.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      closeButton
      // Long enough to read a sentence explaining what to do next.
      duration={5000}
      toastOptions={{ className: 'hl-toast' }}
    />
  );
}
