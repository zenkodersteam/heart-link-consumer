import type { Appearance } from '@clerk/types';

/**
 * Brand skin for Clerk's hosted forms.
 *
 * The card chrome is stripped rather than restyled — AuthShell already supplies
 * the heading, panel and spacing, so Clerk's own card would sit as a second box
 * inside the first.
 */
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: '#e91e73',
    colorText: '#2e1240',
    colorTextSecondary: '#6e5c80',
    colorBackground: '#ffffff',
    colorInputBackground: '#ffffff',
    colorDanger: '#d64550',
    borderRadius: '12px',
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
  },
  elements: {
    // Inline, not a `w-full` class: Clerk injects its own styles at runtime and
    // they win the cascade, so the utility class was ignored and the form sat
    // ~200px wide inside a 327px column.
    rootBox: { width: '100%' },
    // Style objects, not utility classes: Clerk's own CSS wins over a
    // `hidden` class, so the card header and footer kept rendering — a second
    // heading under AuthShell's, plus a duplicate sign-up link.
    header: { display: 'none' },
    footer: { display: 'none' },
    cardBox: { boxShadow: 'none', border: 'none', width: '100%' },
    card: { boxShadow: 'none', border: 'none', background: 'transparent', padding: 0, width: '100%' },
    formButtonPrimary:
      'h-12 rounded-full bg-primary text-white font-semibold shadow-[0_10px_24px_rgba(233,30,115,0.24)] hover:bg-primary-hover normal-case text-sm',
    formFieldLabel:
      'text-[11px] uppercase tracking-[0.14em] text-ink-soft font-semibold',
    formFieldInput:
      'h-12 rounded-xl border-line-strong bg-white text-ink focus:border-primary focus:ring-primary',
    socialButtonsBlockButton: 'h-12 rounded-full border-line-strong',
    dividerLine: 'bg-line',
    dividerText: 'text-ink-faint text-xs',
    // The code step reuses the generic field class, so without its own sizing
    // one wide input is drawn across the row of digit boxes.
    otpCodeFieldInputs: 'gap-2 justify-center',
    otpCodeFieldInput:
      'aspect-square max-w-12 flex-1 min-w-0 rounded-xl border-line-strong text-center text-lg text-ink focus:border-primary',
    identityPreviewEditButton: 'text-primary',
    formResendCodeLink: 'text-primary',
  },
};
