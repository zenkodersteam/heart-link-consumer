/**
 * Type, spacing and radius scales shared by every HeartLink surface.
 *
 * Font *families* are declared per platform (Expo loads the bundled family
 * names, the web loads the same faces over CSS), so only the names common to
 * both live here.
 */

export const fontFamilies = {
  /** Display/heading face used for names, page titles and the wordmark. */
  heading: 'BreeSerif_400Regular',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

/** CSS-side equivalents, with the fallbacks a browser needs. */
export const fontStacks = {
  heading: '"Bree Serif", Georgia, serif',
  body: '"Inter", system-ui, sans-serif',
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

/**
 * Type ramp, as raw numbers so React Native and CSS can each render it in their
 * own units. Sizes follow the client screens: a serif display for titles, Inter
 * from 15px down for body and metadata.
 */
export const fontSizes = {
  display: 32,
  h1: 26,
  h2: 20,
  body: 15,
  caption: 13,
  label: 13,
  button: 15,
} as const;

export const lineHeights = {
  display: 38,
  h1: 32,
  h2: 26,
  body: 22,
  caption: 18,
  label: 16,
  button: 20,
} as const;

export type Radii = typeof radii;
export type Spacing = typeof spacing;
