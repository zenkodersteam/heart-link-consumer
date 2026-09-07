/** Landing copy, carried across verbatim from the mobile app. */

export const STEPS = [
  {
    n: '01',
    title: 'Create your account',
    body: 'Sign up free and tell us a little about who you are hoping to write to.',
  },
  {
    n: '02',
    title: 'Read verified profiles',
    body: 'Take your time with real people, in their own words, at your own pace.',
  },
  {
    n: '03',
    title: 'Write your first letter',
    body: 'Send it through our secure mailroom and build trust one letter at a time.',
  },
] as const;

export const SHOWCASE_POINTS = [
  { icon: 'lock', text: 'Private, secure letters' },
  { icon: 'clock', text: 'Reply on your own time' },
  { icon: 'sparkles', text: 'Prompts to break the ice' },
  { icon: 'book', text: 'A dedicated resources section when you need guidance, ideas, or support' },
] as const;

export const TRUST_ITEMS = [
  {
    icon: 'badge-check',
    title: 'Built for real connection',
    body: 'Thoughtful profiles, clear expectations, and a calmer way to meet someone meaningful.',
  },
  {
    icon: 'lock',
    title: 'Private by design',
    body: 'Your letters live in a secure inbox. You choose what you share, and with whom.',
  },
  {
    icon: 'heart-handshake',
    title: 'Support at every step',
    body: 'A real team and real resources are here whenever you need a hand.',
  },
] as const;

export const VALUE_PROPS = [
  { title: 'Meaningful Connections', body: 'Find and connect with incredible people.' },
  { title: 'Secure Communication', body: 'Our secure inbox keeps your letters private and protected.' },
  { title: 'Support & Resources', body: 'Access tools and support for every step of the journey.' },
  { title: 'Hope for the Future', body: 'Building stronger connections for a better tomorrow.' },
] as const;

export const FAQS = [
  {
    q: 'Is HeartLink free to join?',
    a: 'Yes. Creating your account and browsing verified profiles is free. It takes about a minute to get started.',
  },
  {
    q: 'How are profiles verified?',
    a: 'Every member is reviewed by a real person before they can connect, so you are always talking to genuine people.',
  },
  {
    q: 'Is my information private?',
    a: 'Your letters live in a secure inbox and you control what you share. We never sell your data or expose your details.',
  },
  {
    q: 'How do I start a conversation?',
    a: 'Once your account is set up, browse profiles and send a letter to anyone you would like to connect with.',
  },
] as const;

export const LETTER_THREAD = [
  {
    from: 'From Monique',
    body: 'Your last letter about missing your son&apos;s first varsity game hit me hard. The part where you said you still picture him checking the stands felt so specific and real.',
    mine: false,
  },
  {
    from: 'Darnell wrote back',
    body: 'I hated writing that part because it makes the distance feel heavier, but that&apos;s the truth of this place. I want you to know what these days actually feel like.',
    mine: true,
  },
  {
    from: 'Monique replied',
    body: 'Keep telling me the truth then. Tell me what your mornings are like now, what you&apos;re reading in the library, and what you want your son to know.',
    mine: false,
  },
] as const;
