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

/**
 * The most either free-text answer may run to.
 *
 * Both fields accepted any amount of text, and nothing downstream trimmed it —
 * the column is `text` and the API does not check — so a profile could carry
 * an essay that no card layout was built to show.
 */
export const MAX_BIO_CHARS = 500;

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
/**
 * Auto-insert the slashes while a date is typed, and refuse a date that could
 * never exist as it is being typed.
 *
 * Clamping matters more than it looks. Without it "32/06/44" sits on screen
 * looking like a date until Continue answers "Enter your birth date as
 * MM/DD/YYYY" — which is no help at all, because what you typed already looks
 * like MM/DD/YYYY. Refusing the impossible digit as it arrives means the field
 * can only ever show something that reads as a real date.
 *
 * A first month digit above 1 can only mean a single-digit month, so 3 becomes
 * 03 and the field moves on — the behaviour every date mask has, and the one
 * that lets someone type 3 1 1 9 9 0 for March 1990.
 */
export function formatDobInput(raw: string): string {
  const typed = raw.replace(/\D/g, '').slice(0, 8);
  if (!typed) return '';

  // How many of the typed digits the month actually used. A leading 2-9 can
  // only mean a single-digit month, so it consumes one digit and becomes two
  // characters — which is what lets someone type 3 1 1 9 9 0 for 1 March 1990.
  let monthDigits = typed.slice(0, 2);
  let used = monthDigits.length;
  if (monthDigits.length >= 1 && monthDigits[0] > '1') {
    monthDigits = `0${monthDigits[0]}`;
    used = 1;
  } else if (monthDigits.length === 2) {
    const value = Number(monthDigits);
    if (value === 0) monthDigits = '01';
    else if (value > 12) monthDigits = '12';
  }
  if (monthDigits.length < 2) return monthDigits;

  const afterMonth = typed.slice(used);
  if (!afterMonth.length) return `${monthDigits}/`;

  let dayDigits = afterMonth.slice(0, 2);
  let usedDay = dayDigits.length;
  // Likewise a leading 4-9 can only be a single-digit day.
  if (dayDigits[0] > '3') {
    dayDigits = `0${dayDigits[0]}`;
    usedDay = 1;
  } else if (dayDigits.length === 2) {
    const value = Number(dayDigits);
    if (value === 0) dayDigits = '01';
    else if (value > 31) dayDigits = '31';
  }
  if (dayDigits.length < 2) return `${monthDigits}/${dayDigits}`;

  const year = afterMonth.slice(usedDay, usedDay + 4);
  return year.length ? `${monthDigits}/${dayDigits}/${year}` : `${monthDigits}/${dayDigits}/`;
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
    } else if (story.length > MAX_BIO_CHARS) {
      problems.story = `That is ${story.length - MAX_BIO_CHARS} characters over the ${MAX_BIO_CHARS} limit.`;
    }
    const looking = draft.lookingFor.trim();
    if (looking.length < MIN_BIO_CHARS) {
      problems.lookingFor = `Tell us what you're looking for, about ${MIN_BIO_CHARS - looking.length} more characters.`;
    } else if (looking.length > MAX_BIO_CHARS) {
      problems.lookingFor = `That is ${looking.length - MAX_BIO_CHARS} characters over the ${MAX_BIO_CHARS} limit.`;
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

/**
 * Which preference keys each review row summarises, and which step asks them.
 *
 * `step` is here so the profile screen can offer these as four separate things
 * to edit and send someone straight to the step that asks them, instead of the
 * start of the flow. The four sets are the answers with no editor of their own:
 * name, location and story are single fields, but these only read as a group.
 */
export const REVIEW_PREF_GROUPS: {
  label: string;
  step: OnboardingStepKey;
  keys: PrefKey[];
}[] = [
  { label: 'Identity', step: 'identity', keys: ['iAm', 'religion', 'interestedIn'] },
  {
    label: 'Connection',
    step: 'connection',
    keys: ['connectionTypes', 'relationshipPace', 'futureExpectations'],
  },
  {
    label: 'Lifestyle',
    step: 'lifestyle',
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
    step: 'communication',
    keys: ['communicationChannels', 'communicationPace', 'emotionalIntentions', 'loveLanguage'],
  },
];

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

/**
 * The month grid behind the date pickers, shared so the phone and the website
 * cannot disagree about what a month looks like.
 *
 * Deliberately plain arithmetic on local dates. A birth date has no time and no
 * zone — it is the day printed on a document — and running it through UTC is
 * how a date picker hands back yesterday for anyone west of Greenwich.
 */
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Sunday first, matching the calendars both platforms draw by default. */
export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(year, month + 1, 0).getDate();
}

/**
 * A month as six weeks of cells, `null` where the grid runs past the month.
 *
 * Fixed at six rows on purpose: a grid that changes height as you page through
 * the months makes the buttons underneath jump around, and a birth date is
 * usually several months of paging away.
 */
export function monthGrid(year: number, month: number): Array<number | null> {
  const firstWeekday = new Date(year, month, 1).getDay();
  const total = daysInMonth(year, month);
  const cells: Array<number | null> = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= total; day += 1) cells.push(day);
  while (cells.length < 42) cells.push(null);
  return cells;
}

/** The years a birth date may fall in, newest first. */
export function birthYears(): number[] {
  const thisYear = new Date().getFullYear();
  const newest = thisYear - MIN_AGE;
  return Array.from({ length: 100 }, (_, i) => newest - i);
}

/** `MM/DD/YYYY`, the one format the fields and `parseDob` agree on. */
export function toDisplayDate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${mm}/${dd}/${year}`;
}

/**
 * Where a calendar should open.
 *
 * Whatever has already been typed, if it is a real date; otherwise the year
 * someone turning eighteen today was born, which is far nearer any real answer
 * than today's date is.
 */
export function calendarStart(text: string): { year: number; month: number; day: number | null } {
  const iso = parseDob(text);
  if (iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return { year: y, month: m - 1, day: d };
  }
  return { year: new Date().getFullYear() - MIN_AGE, month: 0, day: null };
}
