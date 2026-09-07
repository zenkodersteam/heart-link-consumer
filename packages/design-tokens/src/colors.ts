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

export type Colors = typeof colors;
