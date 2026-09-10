/**
 * HeartLink brand colours — the single source of truth for every surface
 * (mobile, web, admin).
 *
 * Values are measured from the client-delivered screens in
 * `heart-link/docs/screens_from_client` rather than eyeballed: each mockup was
 * sampled per colour family and the dominant cluster taken. Where a measured
 * value disagrees with the 2026-05-18 brand book, the screens win — they are
 * the contract we are matching. Divergences are called out inline.
 *
 * Key names are stable across the 2026-09 re-measure so existing components
 * pick up the corrected values without edits.
 */

export const colors = {
  // ---------------------------------------------------------------------
  // Content surfaces
  // ---------------------------------------------------------------------
  /**
   * Page background. Measured #FDF9F6 in both the Liked and Mailbox mockups.
   * (Was #FBF1EB — noticeably warmer and darker than the delivered screens.)
   */
  bgDeep: '#FDF9F6',
  /** Cards and raised panels sit pure white on the blush page. */
  bgElevated: '#FFFFFF',
  bgCard: '#FFFFFF',
  /** Warm cream fill behind inset/secondary surfaces. */
  surfaceMuted: '#F7EDE6',
  /** The canvas outside the app frame, a shade warmer than the page. */
  surfaceCanvas: '#FEF6F4',

  // ---------------------------------------------------------------------
  // Navigation rail — intentionally left as-is; the rail's look is signed off
  // and is not part of the screen-matching pass.
  // ---------------------------------------------------------------------
  sidebar: '#2E1240',
  sidebarElevated: '#2E1A47',
  sidebarText: '#FBF5E8',
  sidebarTextMuted: '#B9A8D8',

  // ---------------------------------------------------------------------
  // Text on light surfaces
  // ---------------------------------------------------------------------
  textPrimary: '#2E1240',
  textSecondary: '#6E5C80',
  textMuted: '#9C8CAE',

  // ---------------------------------------------------------------------
  // Primary
  // ---------------------------------------------------------------------
  /**
   * Measured #DB0250–#DB0252 across ~99k sampled pixels in all eight mockups,
   * and #DB0252 at the splash "Create Account" CTA specifically.
   *
   * NOTE: the brand book lists Hot Heart Pink as #E91E73, which is lighter and
   * more magenta than anything the client actually shipped. The screens are the
   * spec we are matching, so #DB0252 wins here. Worth reconciling with the
   * brand book owner.
   */
  primary: '#DB0252',
  primaryHover: '#B80143',
  primaryFaint: 'rgba(219, 2, 82, 0.10)',
  onPrimary: '#FFFFFF',

  // ---------------------------------------------------------------------
  // Gold
  //
  // Gold appears in the screens only as hairlines, small glyphs and metallic
  // gradient text, so every sample is contaminated by anti-aliasing against the
  // cream ground. The brand-book values are kept as the more trustworthy
  // source; revisit if the client supplies flat gold artwork.
  // ---------------------------------------------------------------------
  gold: '#C9912E',
  goldBright: '#D6A84F',
  goldFaint: 'rgba(201, 145, 46, 0.16)',

  /** Deep Midnight Purple: photo tint + scrim base, so photography reads as one set. */
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
 * The palette's shape, widened to `string`.
 *
 * `typeof colors` on an `as const` object types every entry as its own literal
 * hex, which is right for reading a token and useless for writing a second
 * palette - a dark value would have to equal the light one to typecheck.
 */
export type Colors = { [K in keyof typeof colors]: string };

/**
 * The same brand after dark.
 *
 * Designed, not inverted. Three rules held throughout:
 *
 * 1. The ground is aubergine, never grey or black. HeartLink's dark surfaces
 *    already exist - the navigation rail and every photo scrim are midnight
 *    purple - so night mode is the rest of the app joining them rather than a
 *    second visual language.
 * 2. Depth comes from lighter surfaces, not shadow. A shadow on a dark ground
 *    is invisible, so a card lifts by being a step paler than the page.
 * 3. The pink is brightened until it works twice: legible as text on the dark
 *    ground, and still able to carry white text when it is a filled button.
 *    #DB0252 fails both at night - it disappears into the ground and it is too
 *    dark to read a label on.
 */
export const darkColors: Colors = {
  // Page, cards, inset fills. Each step is a lift of roughly the same amount,
  // so three levels of surface stay tellable apart without a border.
  bgDeep: '#140720',
  bgElevated: '#1F0E2E',
  bgCard: '#1F0E2E',
  surfaceMuted: '#2A1440',
  surfaceCanvas: '#0F0518',

  // The rail keeps its own identity: it was already the dark surface in the
  // light theme, so at night it lifts slightly rather than changing character.
  sidebar: '#1F0E2E',
  sidebarElevated: '#2A1440',
  sidebarText: '#F6EEF7',
  sidebarTextMuted: '#C3AED6',

  // Warm off-white, not #FFF: pure white on a saturated purple ground buzzes,
  // and the cream is where this brand's light text comes from anyway.
  textPrimary: '#F6EEF7',
  textSecondary: '#C3AED6',
  textMuted: '#9A85B0',

  primary: '#F0356F',
  primaryHover: '#FF6DA0',
  primaryFaint: 'rgba(240, 53, 111, 0.16)',
  onPrimary: '#FFFFFF',

  gold: '#E0B768',
  goldBright: '#EFCE8E',
  goldFaint: 'rgba(224, 183, 104, 0.14)',

  midnight: '#0C0313',
  // Photos need less help at night - the page is already dark, so a heavy tint
  // only makes them muddy.
  photoTint: 'rgba(0, 0, 0, 0.18)',
  scrimStrong: 'rgba(8, 2, 14, 0.90)',

  success: '#56C08D',
  danger: '#FF6B72',

  border: 'rgba(246, 238, 247, 0.12)',
  borderStrong: 'rgba(246, 238, 247, 0.22)',
  overlay: 'rgba(6, 1, 10, 0.62)',
};
