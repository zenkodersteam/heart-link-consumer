/**
 * The post-signup onboarding flow, shared by the website and the phone app.
 *
 * Before an outside member can write to anyone they introduce themselves: name,
 * birth date (18+), location, how they identify, what they are looking for, and
 * a short story. Each step saves as a draft; the last one submits for
 * moderation (draft -> pending -> approved), mirroring how inmate profiles are
 * reviewed.
 *
 * The step list, the option vocabulary and the validation rules live here
 * rather than in either app because they are the same product promise on both.
 * A second copy is a second chance for the two surfaces to ask people different
 * questions, or to disagree about who counts as 18. Rendering is left to each
 * surface; only the definition lives here.
 */

export type OnboardingStepKey =
  | 'name'
  | 'location'
  | 'identity'
  | 'connection'
  | 'lifestyle'
  | 'communication'
  | 'story'
  | 'photo'
  | 'review';

export interface OnboardingStep {
  key: OnboardingStepKey;
  title: string;
  subtitle: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: 'name',
    title: 'Introduce yourself',
    subtitle:
      'Members you write to see your name. Real introductions are what make HeartLink safe for everyone.',
  },
  {
    key: 'location',
    title: 'Where are you based?',
    subtitle: 'Just a city and state. We never share your exact address.',
  },
  {
    key: 'identity',
    title: 'Tell us how you identify',
    subtitle:
      'These are the same relationship-context questions from the intake form that apply to outside members too.',
  },
  {
    key: 'connection',
    title: 'What kind of connection do you want?',
    subtitle:
      'This helps us guide people toward the kind of correspondence they are both looking for.',
  },
  {
    key: 'lifestyle',
    title: 'Share your values and lifestyle',
    subtitle:
      'Choose the details that feel relevant. You can skip anything you would rather not answer.',
  },
  {
    key: 'communication',
    title: 'How do you like to communicate?',
    subtitle:
      'Letters stay central, but pace and expectations matter before someone invests in a connection.',
  },
  {
    key: 'story',
    title: 'Tell your story',
    subtitle:
      'A few sentences about who you are and why you are here. This appears alongside your letters.',
  },
  {
    key: 'photo',
    title: 'Add a photo',
    subtitle:
      'A friendly photo builds trust with the people you write to. You can also add one later from Account.',
  },
  {
    key: 'review',
    title: 'Review and submit',
    subtitle:
      'Our team reviews every new member profile, usually within a day. You can browse right away.',
  },
];

export type PrefKey =
  | 'iAm'
  | 'religion'
  | 'exercise'
  | 'education'
  | 'languages'
  | 'connectionTypes'
  | 'relationshipPace'
  | 'values'
  | 'interestedIn'
  | 'tattoos'
  | 'kids'
  | 'politicalViews'
  | 'loveLanguage'
  | 'interests'
  | 'communicationChannels'
  | 'communicationPace'
  | 'futureExpectations'
  | 'emotionalIntentions'
  | 'lookingFor';

export type PreferenceState = Partial<Record<PrefKey, string | string[]>>;

export const ONBOARDING_OPTIONS = {
  iAm: [
    'Straight Woman',
    'Straight Man',
    'Gay Man',
    'Lesbian',
    'Bisexual Man',
    'Bisexual Woman',
    'Non-binary',
    'Other',
    'Prefer not to say',
  ],
  religion: [
    'Christian',
    'Catholic',
    'Muslim',
    'Jewish',
    'Hindu',
    'Buddhist',
    'Spiritual',
    'Agnostic',
    'Atheist',
    'Other',
    'Prefer not to say',
  ],
  exercise: ['Never', 'Sometimes', 'Regularly', 'Daily'],
  education: [
    'Some HS',
    'HS / GED',
    'Some College',
    "Associate's",
    "Bachelor's",
    "Master's",
    'Doctorate',
    'Trade / Vocational',
  ],
  languages: [
    'English',
    'Spanish',
    'French',
    'German',
    'Portuguese',
    'Chinese',
    'Arabic',
    'Sign Language',
    'Other',
  ],
  connectionTypes: [
    'Pen Pal',
    'Friendship',
    'Emotional Support',
    'Serious Relationship',
    'Marriage-minded',
    'Faith-based',
  ],
  relationshipPace: ['Very Slow', 'Slow', 'Moderate', 'Fast'],
  values: [
    'Family-oriented',
    'Faith / Spirituality',
    'Personal Growth',
    'Loyalty',
    'Humor',
    'Health / Fitness',
    'Education',
    'Second-chance Mindset',
  ],
  interestedIn: ['Men', 'Women', 'Non-binary', 'Everyone'],
  tattoos: ['None', 'A Few', 'Many', 'Heavily Tattooed'],
  kids: ['No Kids', 'Have Kids', 'Want Kids', 'Do Not Want Kids', 'Open'],
  politicalViews: [
    'Liberal',
    'Conservative',
    'Moderate',
    'Libertarian',
    'Progressive',
    'Apolitical',
    'Other',
    'Prefer not to say',
  ],
  loveLanguage: [
    'Words of Affirmation',
    'Quality Time',
    'Receiving Gifts',
    'Acts of Service',
    'Physical Touch',
  ],
  interests: [
    'Music',
    'Movies',
    'Books',
    'Sports',
    'Cooking',
    'Art',
    'Fitness',
    'Gaming',
    'Nature',
    'Writing',
    'Meditation',
    'Tech',
  ],
  communicationChannels: [
    'Letters / Mail',
    'Facility-approved messaging',
    'Phone Calls',
    'Video Visits',
  ],
  communicationPace: ['Slow OK', 'Frequent'],
  futureExpectations: [
    'During incarceration only',
    'Open after release',
    'Marriage potential',
    'Unsure',
  ],
  emotionalIntentions: [
    'Regular conversation',
    'Companionship',
    'Motivation / growth',
    'Fun / light',
    'Deep connection',
    'Emotional support',
    'Spiritual connection',
    'Future planning',
  ],
} as const satisfies Record<string, readonly string[]>;

/** Shortest bio and "looking for" we will accept, in characters. */
export const MIN_BIO_CHARS = 40;

/** Youngest member HeartLink will accept, in years. */
export const MIN_AGE = 18;

// ---------------------------------------------------------------------------
// Date handling
//
// Birth date is typed as MM/DD/YYYY on both surfaces and stored as an ISO date.
// Age is what actually gates the account, so the parse is strict: a rolled-over
// date like 02/31/2000 must not quietly become March 2nd.
// ---------------------------------------------------------------------------

/** "MM/DD/YYYY" -> ISO "YYYY-MM-DD", or null when the date is not real. */
export function parseDob(text: string): string | null {
  const m = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (
    d.getFullYear() !== Number(yyyy) ||
    d.getMonth() !== Number(mm) - 1 ||
    d.getDate() !== Number(dd)
  ) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}

export function ageFromIso(iso: string): number {
  const dob = new Date(iso);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** Auto-insert slashes while someone types a date. */
export function formatDobInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function isoToDisplay(iso: string | null): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : '';
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface OnboardingDraft {
  name: string;
  dob: string;
  location: string;
  story: string;
  lookingFor: string;
}

/**
 * The message to show for a step, or null when it is good to continue.
 *
 * Both surfaces call this for the error text *and* derive the Continue button's
 * enabled state from it, so what blocks the button is always what explains
 * itself — the two cannot drift apart.
 */
/**
 * What is wrong on this step, keyed by the field each problem belongs under.
 *
 * A record rather than one sentence, because the message is shown beneath the
 * field it is about. Returning only the first problem meant someone with an
 * empty name and an unreadable date fixed the name, pressed Continue, and only
 * then heard about the date; every problem on the step is reported at once.
 *
 * An empty object means the step is ready.
 */
export function validateStep(
  step: OnboardingStepKey,
  draft: OnboardingDraft,
): Record<string, string> {
  const problems: Record<string, string> = {};
  if (step === 'name') {
    if (draft.name.trim().length < 2) problems.name = 'Please enter your name.';
    const iso = parseDob(draft.dob);
    if (!iso) problems.dob = 'Enter your birth date as MM/DD/YYYY.';
    else if (ageFromIso(iso) < MIN_AGE) {
      problems.dob = `You must be ${MIN_AGE} or older to join HeartLink.`;
    }
  }
  if (step === 'location' && draft.location.trim().length < 2) {
    problems.location = 'Please enter your city and state.';
  }
  if (step === 'story') {
    const story = draft.story.trim();
    if (story.length < MIN_BIO_CHARS) {
      problems.story = `Tell us a little more, about ${MIN_BIO_CHARS - story.length} more characters.`;
    }
    const looking = draft.lookingFor.trim();
    if (looking.length < MIN_BIO_CHARS) {
      problems.lookingFor = `Tell us what you're looking for, about ${MIN_BIO_CHARS - looking.length} more characters.`;
    }
  }
  return problems;
}

/** Flattens the chosen preferences for a set of keys into one review line. */
export function summarizePrefs(prefs: PreferenceState, keys: PrefKey[]): string {
  const parts = keys.flatMap((key) => {
    const value = prefs[key];
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
  });
  return parts.length ? parts.join(', ') : '-';
}

/** Which preference keys each review row summarises. */
export const REVIEW_PREF_GROUPS: { label: string; keys: PrefKey[] }[] = [
  { label: 'Identity', keys: ['iAm', 'religion', 'interestedIn'] },
  { label: 'Connection', keys: ['connectionTypes', 'relationshipPace', 'futureExpectations'] },
  {
    label: 'Lifestyle',
    keys: [
      'values',
      'interests',
      'education',
      'exercise',
      'languages',
      'tattoos',
      'kids',
      'politicalViews',
    ],
  },
  {
    label: 'Communication',
    keys: ['communicationChannels', 'communicationPace', 'emotionalIntentions', 'loveLanguage'],
  },
];
