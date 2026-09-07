/**
 * Support Circle (Phase 0) content module.
 *
 * All copy here is HeartLink-authored editorial. There is no member-authored
 * content, no network call, and no write path anywhere in this feature. See
 * docs/ai/support-circle-roadmap.md for the phasing and the safety posture.
 *
 * Content rules this file must keep (roadmap section 3):
 * - No prompt solicits personally identifying information from either party.
 * - No prompt encourages promises, financial commitments, or legal discussion.
 * - Warm and specific, never romantic-pressure. This is correspondence
 *   support, not dating copy.
 * - Anything touching mental health links out to Resources; we do not counsel.
 * - No new verification claims. The locked rule stands: profiles originate as
 *   mailed paper applications reviewed before publishing, and the gold badge
 *   marks profiles that pass additional identity checks.
 *
 * Portability note: pure data plus pure helpers, with no React import and no
 * dependency on either app's icon set — shared by the website and the phone
 * app, and ready for a third surface.
 */

/**
 * Icon vocabulary for a moment.
 *
 * Names, not components: this module cannot reach either surface's icon set,
 * so each maps these six to its own. They happen to be Feather's spellings,
 * which is what the phone app draws.
 */
export type MomentIconKey = 'mail' | 'repeat' | 'clock' | 'cloud-rain' | 'sun' | 'calendar';

export interface Prompt {
  /** Stable within its moment; used for lookup and as a React key. */
  id: string;
  title: string;
  /** The prompt itself, written to be read as guidance and started from. */
  body: string;
  /** Short editorial note. This is the quality bar the client is approving. */
  why: string;
}

export interface Moment {
  key: string;
  title: string;
  /** One line for the list row. */
  blurb: string;
  /** Longer framing shown at the top of the moment. */
  intro: string;
  icon: MomentIconKey;
  prompts: Prompt[];
}

export const MOMENTS: Moment[] = [
  {
    key: 'first-letter',
    title: 'The first letter',
    blurb: 'You have never written to them before, and the page is very blank.',
    intro:
      'A first letter is not an audition. It only has to do two things: show that a real person wrote it, and give them something easy to answer.',
    icon: 'mail',
    prompts: [
      {
        id: 'why-you-wrote',
        title: 'Say why you wrote',
        body: 'Start with the plain truth: "I read your profile and something in it made me want to write." Then name the one thing that made you stop, a book they mentioned, a line about their mornings, the way they described home. Specific beats flattering.',
        why: 'An opening that names a real detail proves someone read the profile rather than a list. It also hands them something concrete to answer, which is most of what a first letter is for.',
      },
      {
        id: 'one-ordinary-day',
        title: 'Give them one ordinary day',
        body: 'Walk them through a single unremarkable day of yours, waking to dark. The coffee, the drive, the thing that annoyed you at three in the afternoon, what you ended up making for dinner.',
        why: 'Ordinary detail is the currency of correspondence. It costs you nothing to write and it gives them a world to picture and a dozen things to ask about.',
      },
      {
        id: 'one-real-question',
        title: 'Ask one question you actually want answered',
        body: 'Close with a single question, and make it one you are genuinely curious about. What does a good day in there look like. What are you reading. What did you used to cook when you cooked for people.',
        why: 'One question is answerable; five reads like a form. Ending on a question also makes the reply easy to begin.',
      },
    ],
  },
  {
    key: 'keeping-it-going',
    title: 'Keeping it going',
    blurb: 'You have written before. Now you need something to say that is not "how are you".',
    intro:
      'The second and tenth letters are harder than the first, because nothing dramatic has happened. That is fine. Correspondence runs on continuity, not news.',
    icon: 'repeat',
    prompts: [
      {
        id: 'pick-up-where-you-left-off',
        title: 'Pick up where you left off',
        body: 'Before you say anything new, answer something from their last letter. "You asked about my sister, so here is the entire saga." Then move on to your own week.',
        why: 'It shows you kept their letter and read it twice. Continuity is what turns two letters into a correspondence.',
      },
      {
        id: 'a-running-thread',
        title: 'Start a running thread',
        body: 'Choose one thing you will report on in every letter: what is coming up in the garden, how a team is doing, what you cook on Sundays. Tell them you will keep them posted, then actually do it.',
        why: 'A running thread gives both of you a reliable place to start when the week held nothing, which is most weeks.',
      },
      {
        id: 'describe-a-place',
        title: 'Describe a place in detail',
        body: 'Take somewhere you were this week, a laundromat, a lake, a waiting room, and describe it to someone who cannot go. Sound, light, temperature, who else was there and what they were doing.',
        why: 'Sensory detail travels further than news, and it is the kind of writing people reread when a day is long.',
      },
    ],
  },
  {
    key: 'after-a-gap',
    title: 'After a long gap',
    blurb: 'Life got in the way and you feel behind. Start anyway.',
    intro:
      'The longer the silence, the larger the letter feels, and the larger it feels the longer the silence gets. The way out is a short letter, sent this week.',
    icon: 'clock',
    prompts: [
      {
        id: 'name-the-gap-once',
        title: 'Name the gap once, then move on',
        body: 'One line, not an essay: "It has been a while and that is on me. I am here now." Then go straight into what you have been doing.',
        why: 'A short acknowledgment respects them without turning the letter into an apology they have to manage. Guilt is heavy to receive by mail.',
      },
      {
        id: 'five-short-things',
        title: 'Catch them up in five short things',
        body: 'List five things that changed since you last wrote, a sentence or two each. A job, a move, a haircut, a small disaster, something you are looking forward to.',
        why: 'A list breaks the paralysis of summarizing months in a paragraph, and it gives them five separate things to reply to.',
      },
      {
        id: 'ask-what-you-missed',
        title: 'Ask what you missed',
        body: 'Ask them directly: what changed for you while I was quiet, and what should I know first.',
        why: 'It hands the floor back, and it signals that you expect this to continue rather than restart.',
      },
    ],
  },
  {
    key: 'hard-news',
    title: 'Hard news',
    blurb: 'Something happened out here and you are not sure how to say it.',
    intro:
      'Hard news is harder to receive inside, because almost nothing can be done about it from there. Write it plainly, early in the letter, and stay on the page afterwards. If you or they are in crisis, Resources lists organizations that can help; HeartLink is not a counseling service.',
    icon: 'cloud-rain',
    prompts: [
      {
        id: 'lead-with-the-fact',
        title: 'Lead with the fact, then stay',
        body: 'Put the news in the first two lines, plainly, and then keep writing. Tell them what is being done about it and what the days look like now.',
        why: 'Burying hard news makes the reader brace through the whole letter. Saying it early and continuing shows them the ground is still there.',
      },
      {
        id: 'name-the-ask',
        title: 'Say what you need, or say you need nothing',
        body: 'Be explicit about it: "I am not telling you this so you can fix it. I am telling you because you would want to know."',
        why: 'Someone inside often cannot act on news from out here, and that helplessness is its own weight. Naming the ask, or the absence of one, takes it off them.',
      },
      {
        id: 'somewhere-to-land',
        title: 'Leave them somewhere to land',
        body: 'Give the last part of the page to something ordinary and unrelated, and mean it. The dog. The weather. A bad film you sat all the way through.',
        why: 'It keeps the hard news from taking the whole letter, and gives them somewhere gentle to be before they set it down.',
      },
    ],
  },
  {
    key: 'encouragement',
    title: 'Encouragement',
    blurb: 'They are carrying something heavy and you want to be steady.',
    intro:
      'Encouragement fails when it is general and it fails when it is loud. What works is specific, and small enough that you can keep doing it.',
    icon: 'sun',
    prompts: [
      {
        id: 'be-specific',
        title: 'Be specific about what you admire',
        body: 'Skip "stay strong". Name one concrete thing they did or said that you have thought about since, and say why it stuck with you.',
        why: 'General praise is easy to discount. A specific observation is evidence, and evidence is what people hold onto on bad days.',
      },
      {
        id: 'steady-not-grand',
        title: 'Be steady rather than grand',
        body: 'Talk about the future in small, keepable pieces. The letters you intend to keep writing. The recipe you will type out next time. The thing you will tell them about when it happens.',
        why: 'Commitments you can actually keep are what make a correspondence feel safe. Big promises put weight on someone who cannot check whether you meant them.',
      },
      {
        id: 'let-them-be-unwell',
        title: 'Let them have a bad week',
        body: 'Write a paragraph that asks nothing and fixes nothing: "You do not have to be okay in your next letter. Write me a bad one."',
        why: 'Permission to be honest is often the most useful thing an outside person can offer, and it makes the next reply much easier to start.',
      },
    ],
  },
  {
    key: 'dates-that-matter',
    title: 'Dates that matter',
    blurb: 'Holidays, birthdays, and the days only the two of you remember.',
    intro:
      'On a date that matters, timing is most of the gift, and timing is the part you control. Write early.',
    icon: 'calendar',
    prompts: [
      {
        id: 'write-early',
        title: 'Write for the date, not on it',
        body: 'Send it two or three weeks ahead. Mail takes five to ten business days and mailroom review adds more; a birthday letter that lands late lands wrong.',
        why: 'Delivery is the one part of this you can plan around, and writing early is how you plan around it.',
      },
      {
        id: 'the-private-anniversary',
        title: 'Mark the day nobody else knows',
        body: 'Pick a date that means nothing to anyone but the two of you, the day you met, a trip, the week a bad year finally ended, and write about it in detail.',
        why: 'An anniversary the calendar does not know about is proof that someone is keeping the record. That is rare, and it lands.',
      },
      {
        id: 'honest-holiday',
        title: 'Say how you will actually spend the day',
        body: 'Describe the holiday honestly: who will be there, what will be cooked, what will be missing. Then say plainly where they fit into it.',
        why: 'Cheerful vagueness reads as distance. Honest detail, including the missing part, is what makes someone feel counted rather than managed.',
      },
    ],
  },
];

/** A thing to avoid in a letter, paired with what to do instead. */
export interface MailroomRule {
  avoid: string;
  instead: string;
}

/**
 * Deliverability guidance. Framed as what mailrooms reject, because that is the
 * concrete consequence a member can act on. Do not restate this as a HeartLink
 * guarantee: every facility sets its own rules and reviews its own mail.
 */
export const MAILROOM_RULES: MailroomRule[] = [
  {
    avoid: 'Explicit content, or anything a stranger reviewing the page would flag.',
    instead:
      'Warmth carried by specifics and plain language. Every letter is read by mailroom staff before it reaches the person you wrote to.',
  },
  {
    avoid:
      'Arrangements that involve anyone else: passing messages along, sharing a third person’s contact details, acting on someone else’s behalf.',
    instead:
      'Keep the letter between the two of you. Third-party arrangements are the quickest route to a rejected letter.',
  },
  {
    avoid: 'Money. Requests for it, promises of it, account details, or plans to send it.',
    instead:
      'If money comes up, bring it to HeartLink support instead of the page. Money requests are also the most common scam pattern aimed at people who write to someone inside.',
  },
  {
    avoid: 'Legal strategy, case details, and advice about getting around a facility’s rules.',
    instead:
      'Say you are thinking about them and leave the case to their attorney. Resources lists organizations that do this work.',
  },
  {
    avoid:
      'Anything you would not want a third party to hold: your home address, your workplace, your daily route, your financial details.',
    instead:
      'HeartLink prints and mails your letter and receives replies at our processing center, so your home address stays out of it. Keep it out of the body of the letter too.',
  },
];

export type PlanKey = 'basic' | 'diamond' | 'vip';

export interface PlanWordLimit {
  key: PlanKey;
  plan: string;
  words: number;
  /** Plain-language sense of the length, so the number means something. */
  feels: string;
}

/**
 * Plan word limits, matching the locked Support copy (Basic 200, Diamond 300,
 * VIP 350). Client-side display only. Confirm against the final live Stripe
 * plan products before treating these as authoritative.
 */
export const PLAN_WORD_LIMITS: PlanWordLimit[] = [
  { key: 'basic', plan: 'Basic', words: 200, feels: 'About one handwritten page.' },
  { key: 'diamond', plan: 'Diamond', words: 300, feels: 'A page and a half.' },
  { key: 'vip', plan: 'VIP', words: 350, feels: 'Close to two pages.' },
];

/** Fallback is the most restrictive limit, so a wrong plan never over-promises. */
const DEFAULT_WORD_LIMIT = 200;

export function wordLimitForPlan(plan: string | null | undefined): number {
  if (!plan) return DEFAULT_WORD_LIMIT;
  const match = PLAN_WORD_LIMITS.find((p) => p.key === plan.trim().toLowerCase());
  return match ? match.words : DEFAULT_WORD_LIMIT;
}

export const PRE_SEND_CHECKLIST: string[] = [
  'Read it once out loud. Anything that sounds performed usually reads that way too.',
  'Check that you asked at least one question they can actually answer.',
  'Take out anything that is really about someone else’s business.',
  'Remove every address, phone number, email, and account detail, yours and anyone else’s.',
  'Confirm nothing in it asks for money or promises money.',
  'Check the length against your plan so it prints as one clean letter.',
  'If it is timed to a date, count backwards: five to ten business days, plus mailroom review.',
];

/** Returns the moment for a key, or null. Never throws on an unknown key. */
export function findMoment(key: string | null | undefined): Moment | null {
  if (!key) return null;
  return MOMENTS.find((m) => m.key === key) ?? null;
}

/** Returns a prompt within a moment, or null. Never throws on an unknown key. */
export function findPrompt(momentKey: string | null | undefined, promptId: string | null | undefined): Prompt | null {
  const moment = findMoment(momentKey);
  if (!moment || !promptId) return null;
  return moment.prompts.find((p) => p.id === promptId) ?? null;
}

export const TOTAL_PROMPT_COUNT = MOMENTS.reduce((n, m) => n + m.prompts.length, 0);
