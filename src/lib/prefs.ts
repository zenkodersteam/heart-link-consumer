/**
 * Defensive reader for the API's untyped matchPreferences OCR blob.
 * Absent or malformed keys yield null/[] so sections simply hide.
 */

export interface Prefs {
  seeking: string | null;
  typeOfConnection: string[];
  emotionalIntentions: string[];
  valuesLifestyle: string[];
  interestedIn: string | null;
  relationshipPace: string | null;
  futureExpectations: string | null;
  loveLanguage: string | null;
  heightRange: string | null;
  iAm: string | null;
  religion: string | null;
  exercise: string | null;
  education: string | null;
  tattoos: string | null;
  kids: string | null;
  politicalViews: string | null;
  languages: string[];
  communicationChannels: string[];
}

// PDF enum codes arrive snake_case; render the client-facing labels.
// Anything unknown falls back to Title Case with spaces.
const LABELS: Record<string, string> = {
  pen_pal: 'Pen Pal',
  marriage_minded: 'Marriage-Minded',
  faith_based: 'Faith-Based',
  fun_light: 'Fun & Light',
  motivation_growth: 'Motivation & Growth',
  deep_connection: 'Deep Connection',
  regular_conversation: 'Regular Conversation',
  future_planning: 'Future Planning',
  faith_spirituality: 'Faith & Spirituality',
  health_fitness: 'Health & Fitness',
  family_oriented: 'Family-Oriented',
  second_chance_mindset: 'Second-Chance Mindset',
  words_of_affirmation: 'Words of Affirmation',
  quality_time: 'Quality Time',
  acts_of_service: 'Acts of Service',
  physical_touch: 'Physical Touch',
};

export function prettyLabel(code: string): string {
  const key = code.trim().toLowerCase();
  if (LABELS[key]) return LABELS[key];
  return key
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'Washington, D.C.',
};

/** "CA" -> "California" (mockup shows full state names); unknown codes pass through. */
export function stateName(code: string | null | undefined): string | null {
  if (!code) return null;
  return STATE_NAMES[code.trim().toUpperCase()] ?? code;
}

function asStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && !!x.trim());
  if (typeof v === 'string' && v.trim()) {
    return v.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function parsePrefs(raw: unknown): Prefs {
  const p = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  // Enum-coded fields render as friendly labels; `seeking` stays free text.
  const str = (v: unknown) => {
    const s = asStr(v);
    return s ? prettyLabel(s) : null;
  };
  const list = (v: unknown) => asList(v).map(prettyLabel);
  return {
    seeking: asStr(p.seeking),
    typeOfConnection: list(p.typeOfConnection ?? p.type_of_connection),
    emotionalIntentions: list(p.emotionalIntentions ?? p.emotional_intentions),
    valuesLifestyle: list(p.valuesLifestyle ?? p.values_and_lifestyle),
    interestedIn: str(p.interestedIn ?? p.interested_in),
    relationshipPace: str(p.relationshipPace ?? p.relationship_pace),
    futureExpectations: str(p.futureExpectations ?? p.future_expectations),
    loveLanguage: str(p.loveLanguage ?? p.love_language),
    heightRange: asStr(p.heightRange ?? p.height_range),
    iAm: str(p.iAm ?? p.i_am),
    religion: str(p.religion),
    exercise: str(p.exercise),
    education: str(p.education),
    tattoos: str(p.tattoos),
    kids: str(p.kids),
    politicalViews: str(p.politicalViews ?? p.political_views),
    languages: list(p.languages),
    communicationChannels: list(p.communicationChannels ?? p.communication_channels),
  };
}

/** Date-only strings parse as UTC midnight; construct locally to avoid the
 * previous-day (wrong month) shift in western timezones. */
export function formatReleaseMonth(iso: string): string {
  const dateOnly = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}
