/**
 * HeartLink consumer brand tokens.
 *
 * The values themselves live in `@heartlink/design-tokens`, shared with the
 * website so the two surfaces cannot drift. This module re-exports them under
 * the names the phone app already uses, and adds the two pieces that only make
 * sense in React Native: the `type` ramp as `TextStyle` objects, and the web
 * input reset.
 *
 * Changing a colour means editing `packages/design-tokens/src/colors.ts` and
 * running `npm run tokens:build` so the website's generated CSS follows.
 */

import { Platform, type TextStyle } from 'react-native';

import {
  colors,
  shell,
  auth,
  cta,
  elevation,
  fontFamilies,
  radii,
  spacing,
  fontSizes,
  lineHeights,
} from '@heartlink/design-tokens';

export { colors, shell, auth, cta, elevation, radii, spacing };

/** The phone app has always called these `fonts`. */
export const fonts = fontFamilies;

/**
 * Text styles, assembled from the shared scale.
 *
 * Kept here rather than in the token package because `TextStyle` is a React
 * Native type: the website builds the same ramp out of CSS instead.
 */
export const type = {
  display: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.display,
    lineHeight: lineHeights.display,
    color: colors.textPrimary,
  },
  h1: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.h1,
    lineHeight: lineHeights.h1,
    color: colors.textPrimary,
  },
  h2: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.h2,
    lineHeight: lineHeights.h2,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    color: colors.textPrimary,
  },
  bodyMuted: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    color: colors.textSecondary,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
    color: colors.textMuted,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.label,
    lineHeight: lineHeights.label,
    color: colors.textSecondary,
  },
  button: {
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.button,
    lineHeight: lineHeights.button,
    color: colors.textPrimary,
  },
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
