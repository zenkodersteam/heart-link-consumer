/**
 * HeartLink consumer brand tokens, in both themes.
 *
 * The values live in `@heartlink/design-tokens`, shared with the website so the
 * two surfaces cannot drift. This module re-exports them under the names the
 * phone app already uses, adds the two pieces that only make sense in React
 * Native - the `type` ramp as `TextStyle` objects, and the web input reset -
 * and resolves every one of them against the theme that is currently on.
 *
 * ## How the theme reaches a StyleSheet
 *
 * `StyleSheet.create` runs once, when a module is first imported, so a colour
 * read inside one is the colour that was current at app start and stays that
 * way forever. Rewriting all 43 stylesheets in this app into hooks would be a
 * large and error-prone change, so instead:
 *
 *   - `colors`, `depth`, `type` and the rest are proxies. Reading `.primary`
 *     during a render returns the active theme's value.
 *   - `themedStyles(factory)` wraps a stylesheet. It builds - and caches - one
 *     real StyleSheet per theme, and hands back whichever matches the theme
 *     that is on. Call sites keep writing `styles.card`.
 *
 * Both are read at property-access time, which is render time, which is what
 * makes the swap possible at all. The provider in `ThemeProvider.tsx` sets the
 * active theme before anything renders and remounts the tree when the system
 * setting changes, so nothing is left holding last theme's object.
 *
 * Changing a colour still means editing `packages/design-tokens/src/colors.ts`
 * - both palettes - and running `npm run tokens:build` so the website follows.
 */

import { Platform, StyleSheet, type TextStyle } from 'react-native';

import {
  colors as lightColors,
  darkColors,
  darkDepth,
  shell,
  auth,
  cta,
  depth as lightDepth,
  elevation,
  fontFamilies,
  radii,
  spacing,
  fontSizes,
  lineHeights,
  type Colors,
} from '@heartlink/design-tokens';

export { shell, auth, cta, elevation, radii, spacing };

export type ColorScheme = 'light' | 'dark';

const PALETTES: Record<ColorScheme, Colors> = { light: lightColors, dark: darkColors };
const DEPTHS = { light: lightDepth, dark: darkDepth };

/**
 * The theme every read below resolves against.
 *
 * Module state rather than context because stylesheets are module state too:
 * they are built outside React, and this is what they can see. React's copy of
 * the answer lives in `ThemeProvider`, which owns changing it.
 */
let activeScheme: ColorScheme = 'light';

/** Called by ThemeProvider during render, before anything reads a colour. */
export function setColorScheme(scheme: ColorScheme) {
  activeScheme = scheme;
}

export function getColorScheme(): ColorScheme {
  return activeScheme;
}

/** A view onto one record of the active palette, resolved per read. */
function proxyOf<T extends object>(pick: (scheme: ColorScheme) => T): T {
  return new Proxy({} as T, {
    get: (_t, key) => pick(activeScheme)[key as keyof T],
    has: (_t, key) => key in pick(activeScheme),
    ownKeys: () => Reflect.ownKeys(pick(activeScheme)),
    getOwnPropertyDescriptor: (_t, key) => ({
      ...Object.getOwnPropertyDescriptor(pick(activeScheme), key),
      configurable: true,
    }),
  });
}

/** The brand palette, in whichever theme is on. */
export const colors: Colors = proxyOf((s) => PALETTES[s]);

/** The three surface heights, in whichever theme is on. */
export const depth = proxyOf((s) => DEPTHS[s]);

/** The phone app has always called these `fonts`. */
export const fonts = fontFamilies;

/**
 * Text styles, assembled from the shared scale.
 *
 * Kept here rather than in the token package because `TextStyle` is a React
 * Native type: the website builds the same ramp out of CSS instead. Built per
 * theme, because every entry carries a colour.
 */
function buildType(c: Colors) {
  return {
    display: {
      fontFamily: fontFamilies.heading,
      fontSize: fontSizes.display,
      lineHeight: lineHeights.display,
      color: c.textPrimary,
    },
    h1: {
      fontFamily: fontFamilies.heading,
      fontSize: fontSizes.h1,
      lineHeight: lineHeights.h1,
      color: c.textPrimary,
    },
    h2: {
      fontFamily: fontFamilies.heading,
      fontSize: fontSizes.h2,
      lineHeight: lineHeights.h2,
      color: c.textPrimary,
    },
    body: {
      fontFamily: fontFamilies.body,
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
      color: c.textPrimary,
    },
    bodyMuted: {
      fontFamily: fontFamilies.body,
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
      color: c.textSecondary,
    },
    caption: {
      fontFamily: fontFamilies.body,
      fontSize: fontSizes.caption,
      lineHeight: lineHeights.caption,
      color: c.textMuted,
    },
    label: {
      fontFamily: fontFamilies.bodyMedium,
      fontSize: fontSizes.label,
      lineHeight: lineHeights.label,
      color: c.textSecondary,
    },
    button: {
      fontFamily: fontFamilies.bodySemibold,
      fontSize: fontSizes.button,
      lineHeight: lineHeights.button,
      color: c.textPrimary,
    },
  } satisfies Record<string, TextStyle>;
}

const TYPE = { light: buildType(lightColors), dark: buildType(darkColors) };

/** The type ramp, in whichever theme is on. */
export const type = proxyOf((s) => TYPE[s]);

/**
 * A stylesheet that follows the theme.
 *
 *   const styles = themedStyles((colors) => ({ card: { backgroundColor: colors.bgCard } }));
 *
 * Each theme's sheet is built once, the first time it is asked for, and cached
 * - so a style object keeps a stable identity between renders and `===` checks
 * downstream still hold. Only the outer lookup is per-read.
 */
export function themedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (c: Colors) => T & StyleSheet.NamedStyles<T>,
): T {
  const cache: Partial<Record<ColorScheme, T>> = {};

  const sheetFor = (scheme: ColorScheme): T => {
    const existing = cache[scheme];
    if (existing) return existing;
    const built = StyleSheet.create(factory(PALETTES[scheme]));
    cache[scheme] = built;
    return built;
  };

  return new Proxy({} as T, {
    get: (_t, key) => sheetFor(activeScheme)[key as keyof T],
    has: (_t, key) => key in sheetFor(activeScheme),
    ownKeys: () => Reflect.ownKeys(sheetFor(activeScheme)),
    getOwnPropertyDescriptor: (_t, key) => ({
      ...Object.getOwnPropertyDescriptor(sheetFor(activeScheme), key),
      configurable: true,
    }),
  });
}

/**
 * Web-only reset for text inputs.
 *
 * React Native Web renders a real `<input>`, which arrives with the browser's
 * focus ring and its own font.
 */
export const inputReset = Platform.select({
  web: { outlineStyle: 'none', fontFamily: fontFamilies.body } as object,
  default: {},
});
