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

/**
 * The same three heights, for React Native.
 *
 * Three levels and no more, so height means something: `resting` is a card on
 * the page, `raised` is a surface that came from somewhere (a sheet, a menu, a
 * deck), and `floating` is a control sitting above the content it acts on.
 * Spending shadow by role is what keeps a screen readable - a shadow on every
 * box flattens the hierarchy it was meant to create.
 *
 * iOS reads the four `shadow*` values and Android reads `elevation`; both are
 * given here because a surface that lifts on one platform and not the other is
 * the same bug twice.
 */
export const depth = {
  resting: {
    shadowColor: '#2E1240',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#2E1240',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  floating: {
    shadowColor: '#2E1240',
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
} as const;

/**
 * The same three heights, after dark.
 *
 * A drop shadow on a dark ground is invisible - there is nothing for it to
 * darken. Height at night is carried by the surface being paler than the page,
 * which the dark palette already does, so these keep only enough shadow to
 * separate an overlay from what is behind it, and Android keeps its elevation
 * so the system's own compositing still lifts the view.
 */
export const darkDepth = {
  resting: {
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#000000',
    shadowOpacity: 0.42,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  floating: {
    shadowColor: '#000000',
    shadowOpacity: 0.55,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
} as const;
