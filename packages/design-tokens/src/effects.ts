/**
 * Composite surface treatments: the app shell, the auth art panel and the
 * primary CTA finish.
 *
 * The `shell.*` and `auth.*` rail values are deliberately unchanged by the
 * 2026-09 screen-matching pass — the navigation rail's look is settled.
 * Only the pink-derived values move, to follow `colors.primary`.
 */

import { colors } from './colors';

/** App shell: desktop rail + content column. */
export const shell = {
  railWidth: 248,
  contentMaxWidth: 1020,
  /** 168deg midnight gradient behind the nav rail. */
  railGradient: ['#1B0826', '#2E1240', '#3A1550'],
  /** Pink gradient active nav pill + 3px inset edge. */
  navActiveGradient: ['rgba(219,2,82,0.28)', 'rgba(219,2,82,0.10)'],
  navActiveIcon: '#FF7EB0',
  navHover: 'rgba(255,255,255,0.06)',
  /** Gold hairlines (rail right edge, tagline rule). */
  goldHairline: 'rgba(214,168,79,0.35)',
  goldHairlineFaint: 'rgba(214,168,79,0.05)',
  taglineRule: 'rgba(214,168,79,0.45)',
  emblemGlow: 'rgba(219,2,82,0.45)',
  /** Web-only: gold-as-material gradient text + soft content glows. */
  goldTextGradientCss: 'linear-gradient(100deg, #E8C27A, #D6A84F 45%, #F0D9A8)',
  mainGlowCss:
    'radial-gradient(680px 380px at 78% -80px, rgba(219,2,82,0.07), transparent 65%), ' +
    'radial-gradient(540px 320px at 12% 108%, rgba(214,168,79,0.10), transparent 60%)',
} as const;

/** Sign-in / sign-up art panel. */
export const auth = {
  /** 160deg midnight gradient behind the bridge artwork. */
  panelGradient: ['#1B0826', '#2E1240', '#451A5E'],
  artOpacity: 0.85,
  /** Top-to-bottom dark veil for text legibility over the art. */
  veilDesktop: ['rgba(22,5,31,0.15)', 'rgba(22,5,31,0.78)'],
  veilMobile: ['rgba(22,5,31,0.10)', 'rgba(22,5,31,0.60)'],
  mobileArtHeight: 300,
} as const;

/**
 * Primary CTA finish. The screens render the pill very close to flat
 * `colors.primary`; the gradient keeps a slight lift without drifting off the
 * measured colour.
 */
export const cta = {
  gradientCss: `linear-gradient(135deg, #F02168, ${colors.primary} 55%, ${colors.primaryHover})`,
  glow: '0 10px 24px rgba(219,2,82,0.40)',
  glowHover: '0 14px 30px rgba(219,2,82,0.50)',
} as const;

/** Card elevation used on the blush page background. */
export const elevation = {
  card: '0 1px 2px rgba(46,18,64,0.04), 0 8px 24px rgba(46,18,64,0.06)',
  cardHover: '0 2px 4px rgba(46,18,64,0.05), 0 12px 32px rgba(46,18,64,0.09)',
  /** The stacked profile deck sits higher off the page than a plain card. */
  deck: '0 4px 12px rgba(46,18,64,0.08), 0 20px 48px rgba(46,18,64,0.12)',
} as const;
