/**
 * HeartLink consumer brand tokens.
 *
 * Light theme adopted 2026-06-09 to match the client-delivered screens
 * (docs/screens_from_client in the admin monorepo): warm blush content
 * surfaces, deep-purple navigation rail, Hot Heart Pink primary, Metallic
 * Gold accents, Bree Serif headers, Inter body.
 *
 * Palette sourced from the 2026-05-18 brand book (Hot Heart Pink #E91E73,
 * Metallic Gold #D6A84F, Deep Midnight Purple). The deep purple now lives in
 * the nav rail (`sidebar*`) rather than the page background.
 *
 * NOTE: token keys are kept stable across the dark→light flip so every
 * component that already reads `colors.bgDeep` / `colors.textPrimary` / etc.
 * inherits the new look without edits. Only the values changed; the `sidebar*`
 * keys are additive for the desktop rail + mobile tab accents.
 */

import { Platform, type TextStyle } from 'react-native';

export const colors = {
  // Light content surfaces (warm blush / cream from the screens)
  bgDeep: '#FBF1EB',
  bgElevated: '#FFFFFF',
  bgCard: '#FFFFFF',
  surfaceMuted: '#F3E7E0',

  // Deep-purple navigation rail (desktop sidebar) + dark accents
  sidebar: '#2E1240',
  sidebarElevated: '#2E1A47',
  sidebarText: '#FBF5E8',
  sidebarTextMuted: '#B9A8D8',

  // Text on light surfaces
  textPrimary: '#2E1240',
  textSecondary: '#6E5C80',
  textMuted: '#9C8CAE',

  primary: '#E91E73',
  primaryHover: '#C81860',
  primaryFaint: 'rgba(233, 30, 115, 0.10)',
  onPrimary: '#FFFFFF',

  gold: '#C9912E',
  // Brand-book Metallic Gold, used on dark surfaces (mockup --gold)
  goldBright: '#D6A84F',
  goldFaint: 'rgba(201, 145, 46, 0.16)',

  // Brand-book Deep Midnight Purple: photo tint + scrim base so AI photos read
  // as one unified set. Mirror these in the Flutter app's theme.
  midnight: '#16051F',
  photoTint: 'rgba(46, 18, 64, 0.10)',
  scrimStrong: 'rgba(22, 5, 31, 0.88)',

  success: '#3E9B6E',
  danger: '#D64550',

  border: 'rgba(46, 18, 64, 0.10)',
  borderStrong: 'rgba(46, 18, 64, 0.18)',
  overlay: 'rgba(26, 8, 51, 0.45)',
} as const;

/**
 * App shell (desktop rail + content column) tokens from the 2026-07 UI lift
 * mockup (.claude/mockups/heartlink-ui-mockup.html). Mirror in Flutter.
 */
export const shell = {
  railWidth: 248,
  contentMaxWidth: 1020,
  // 168deg midnight gradient behind the nav rail
  railGradient: ['#1B0826', '#2E1240', '#3A1550'],
  // Pink gradient active nav pill + 3px inset edge
  navActiveGradient: ['rgba(233,30,115,0.28)', 'rgba(233,30,115,0.10)'],
  navActiveIcon: '#FF7EB0',
  navHover: 'rgba(255,255,255,0.06)',
  // Gold hairlines (rail right edge, tagline rule)
  goldHairline: 'rgba(214,168,79,0.35)',
  goldHairlineFaint: 'rgba(214,168,79,0.05)',
  taglineRule: 'rgba(214,168,79,0.45)',
  emblemGlow: 'rgba(233,30,115,0.45)',
  // Web-only: gold-as-material gradient text + soft content glows
  goldTextGradientCss: 'linear-gradient(100deg, #E8C27A, #D6A84F 45%, #F0D9A8)',
  mainGlowCss:
    'radial-gradient(680px 380px at 78% -80px, rgba(233,30,115,0.07), transparent 65%), ' +
    'radial-gradient(540px 320px at 12% 108%, rgba(214,168,79,0.10), transparent 60%)',
} as const;

/** Sign-in / sign-up art panel (UI lift mockup, "brand panel recomposition"). */
export const auth = {
  // 160deg midnight gradient behind the bridge artwork
  panelGradient: ['#1B0826', '#2E1240', '#451A5E'],
  artOpacity: 0.85,
  // Top-to-bottom dark veil for text legibility over the art
  veilDesktop: ['rgba(22,5,31,0.15)', 'rgba(22,5,31,0.78)'],
  veilMobile: ['rgba(22,5,31,0.10)', 'rgba(22,5,31,0.60)'],
  mobileArtHeight: 300,
} as const;

/** Primary CTA finish (UI lift): pink gradient pill with glow. Mirror in Flutter. */
export const cta = {
  gradientCss: 'linear-gradient(135deg, #FF4F92, #E91E73 55%, #C81860)',
  glow: '0 10px 24px rgba(233,30,115,0.40)',
  glowHover: '0 14px 30px rgba(233,30,115,0.50)',
} as const;

export const fonts = {
  heading: 'BreeSerif_400Regular',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const type = {
  display: { fontFamily: fonts.heading, fontSize: 32, lineHeight: 38, color: colors.textPrimary },
  h1: { fontFamily: fonts.heading, fontSize: 26, lineHeight: 32, color: colors.textPrimary },
  h2: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 26, color: colors.textPrimary },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textPrimary },
  bodyMuted: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 16, color: colors.textSecondary },
  button: { fontFamily: fonts.bodySemibold, fontSize: 15, lineHeight: 20, color: colors.textPrimary },
} as const;

/**
 * Text input focus reset for the web build.
 *
 * React Native Web renders TextInput as a real <input>, so the browser draws
 * its own square focus ring over the rounded pill we style. Native ignores
 * this entirely.
 */
export const inputReset: TextStyle | null =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;
