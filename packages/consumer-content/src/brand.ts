/**
 * The four things HeartLink promises, shared by the website and the phone app.
 *
 * They appear on the splash, under the sign-in form, and along the foot of the
 * signed-in screens in the client-delivered designs — the same four, in the
 * same order, every time. Icons are named rather than imported so each surface
 * draws them with its own icon set.
 */

export type BrandPromiseIcon = 'heart' | 'mail' | 'book' | 'support';

export interface BrandPromise {
  key: string;
  icon: BrandPromiseIcon;
  /** Two short lines, as the designs stack them under the icon. */
  title: string;
  /** The longer form, used where there is room for a sentence. */
  blurb: string;
}

export const BRAND_PROMISES: BrandPromise[] = [
  {
    key: 'connections',
    icon: 'heart',
    title: 'Meaningful\nConnections',
    blurb: 'Find and connect with incredible people.',
  },
  {
    key: 'secure',
    icon: 'mail',
    title: 'Secure\nCommunication',
    blurb: 'Our secure inbox keeps your letters private and protected.',
  },
  {
    key: 'resources',
    icon: 'book',
    title: 'Support &\nResources',
    blurb: 'Access tools and support for every step of the journey.',
  },
  {
    key: 'hope',
    icon: 'support',
    title: 'Hope for\nthe Future',
    blurb: 'Building stronger connections for a better tomorrow.',
  },
];

/** The tagline, set as the client screens set it — tildes included. */
export const BRAND_TAGLINE = '~ Love Knows No Bounds ~';

export const BRAND_SUBTITLE = 'Meaningful connections beyond boundaries.';
