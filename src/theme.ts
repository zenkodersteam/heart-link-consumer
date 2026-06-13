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

export const colors = {
  // Light content surfaces (warm blush / cream from the screens)
  bgDeep: '#FBF1EB',
  bgElevated: '#FFFFFF',
  bgCard: '#FFFFFF',
  surfaceMuted: '#F3E7E0',

  // Deep-purple navigation rail (desktop sidebar) + dark accents
  sidebar: '#2A0F4D',
  sidebarElevated: '#3A1A63',
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
  goldFaint: 'rgba(201, 145, 46, 0.16)',

  success: '#3E9B6E',
  danger: '#D64550',

  border: 'rgba(46, 18, 64, 0.10)',
  borderStrong: 'rgba(46, 18, 64, 0.18)',
  overlay: 'rgba(26, 8, 51, 0.45)',
} as const;

export const fonts = {
  heading: 'BreeSerif_400Regular',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
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
