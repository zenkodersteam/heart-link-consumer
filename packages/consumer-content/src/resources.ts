/**
 * The four resource categories, shared by the website and the phone app.
 *
 * The directory entries themselves come from `/api/resources`, but these
 * category headings are editorial: they promise what someone will find before
 * they commit to a tap. Both surfaces show the same four, in the same order,
 * with the same words.
 *
 * `slug` is what the API expects as `categorySlug`. Artwork and iconography are
 * left to each surface — the phone app uses photographic tiles, the website the
 * icon badges from the client screens.
 */

export type ResourceCategoryKey = 'awareness' | 'reentry' | 'mental' | 'community';

export interface ResourceCategoryContent {
  key: ResourceCategoryKey;
  /** Sent to the API as `categorySlug`. */
  slug: string;
  title: string;
  blurb: string;
  /** Shorter blurb, for the narrow cards on a phone. */
  shortBlurb: string;
  tags: string[];
}

export const RESOURCE_CATEGORIES: ResourceCategoryContent[] = [
  {
    key: 'awareness',
    slug: 'awareness',
    title: 'Prison Awareness',
    blurb:
      'Understand the system your person is living inside: education, advocacy, and the organizations doing the work.',
    shortBlurb: 'Learn about the justice system and make a difference.',
    tags: ['Education', 'Advocacy', 'Awareness'],
  },
  {
    key: 'reentry',
    slug: 'reentry',
    title: 'Reentry Support',
    blurb:
      'Resources for successful reintegration: housing, employment, and life skills.',
    shortBlurb: 'Resources for housing, employment, and life skills.',
    tags: ['Employment', 'Housing', 'Life Skills'],
  },
  {
    key: 'mental',
    slug: 'mental',
    title: 'Mental Health Support',
    blurb:
      'Mental health resources, crisis support, and wellness tools for healing and growth.',
    shortBlurb: 'Find mental health resources and wellness support.',
    tags: ['Counseling', 'Wellness', 'Crisis Support'],
  },
  {
    key: 'community',
    slug: 'community',
    title: 'Community Support Groups',
    blurb: 'Connect with local and online groups that offer understanding and support.',
    shortBlurb: 'Connect with groups that offer understanding.',
    tags: ['Peer Support', 'Groups', 'Mentorship'],
  },
];
