/**
 * @heartlink/design-tokens — one source of truth for the brand across mobile,
 * web and admin.
 *
 * Platform notes:
 *  - React Native imports these objects directly (see apps/mobile/src/theme.ts).
 *  - The web consumes `tokens.css`, generated from `colors.ts` + `scale.ts` by
 *    `npm run tokens:build`. Edit the TypeScript, never the generated CSS.
 */

export { colors, type Colors } from './colors';
export {
  fontFamilies,
  fontStacks,
  radii,
  spacing,
  fontSizes,
  lineHeights,
  type Radii,
  type Spacing,
} from './scale';
export { shell, auth, cta, elevation } from './effects';
