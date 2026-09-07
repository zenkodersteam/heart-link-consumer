/**
 * Support answers, shared by the website and the phone app.
 *
 * These describe what the product actually does — how long a letter takes, what
 * a plan costs, how a profile got here — so a second copy is a second chance to
 * tell someone something untrue. Illustration is left to each surface; only the
 * words live here.
 */

export type SupportTopicKey = 'letters' | 'billing' | 'safety';

export interface SupportTopic {
  key: SupportTopicKey;
  title: string;
  blurb: string;
  cardBlurb: string;
  faqs: { q: string; a: string }[];
}

export const SUPPORT_TOPICS: SupportTopic[] = [
  {
    key: 'letters',
    title: 'Letters & Mail',
    blurb: 'Everything about how your words physically travel.',
    cardBlurb: "Where's my letter? Printing, mailing, and scanned replies.",
    faqs: [
      {
        q: 'How long does my letter take to arrive?',
        a: 'Once you hit send, we print and hand your letter to the postal service within 1 business day. Delivery typically takes 5 to 10 business days, and the facility’s own mailroom review can add a few more. You can follow every step from your Mailbox: the status pill moves from Queued to Printed to Mailed.',
      },
      {
        q: 'How do replies get back to me?',
        a: 'Replies are mailed to our processing center, where our team scans them securely into your Mailbox. You read the letter in the app and can view the scanned original anytime.',
      },
      {
        q: 'Why do letters have a word limit?',
        a: 'Your plan sets the letter length (Basic 200, Diamond 300, VIP 350 words) so every letter prints cleanly and clears facility mailroom review without delays.',
      },
      {
        q: "What can't I include in a letter?",
        a: 'Facility mailrooms review all incoming mail and each has its own rules. In general, letters cannot include explicit content, anything unlawful, or arrangements involving third parties. Letters that a mailroom rejects are returned to us and never reach the recipient.',
      },
      {
        q: "What happens if my letter can't be delivered?",
        a: 'If a facility returns or rejects a letter, we mark it in your Mailbox and our team reaches out with next steps.',
      },
    ],
  },
  {
    key: 'billing',
    title: 'Account & Billing',
    blurb: 'Plans, payments, and everything on your account.',
    cardBlurb: 'Plans, payments, and refunds.',
    faqs: [
      {
        q: 'How do plans and payments work?',
        a: 'HeartLink runs on yearly plans: Basic $30, Diamond $45, and VIP $60 per year. Each tier sets how many profile photos you can view per profile and how long your letters can be. Paying and cancelling are both done on the HeartLink website — the app will take you there, and your plan appears in the app straight afterwards. Plans renew yearly, and if you cancel you keep the time you have already paid for. To move to a different tier, contact support and our team will switch it for you.',
      },
      {
        q: 'Can I get a refund on my plan?',
        a: 'We are finalizing our refund policy. If something is not right with your plan, contact support and we will work it out with you directly.',
      },
      {
        q: 'How do I change or cancel my plan?',
        a: 'Contact support and we will take care of it for you. Changing tiers and cancelling are handled by our team right now rather than from your Account page, so message us with what you would like and we will confirm once it is done. If you cancel, your plan stays active for the rest of the period you have already paid for and then does not renew.',
      },
      {
        q: 'Why was my payment declined?',
        a: 'Most declines come from the card issuer: an expired card, a typo in the billing details, or a fraud hold. Try the payment again and check the details. If it keeps failing, contact support.',
      },
      {
        q: 'Where can I see my billing history?',
        a: 'Your card statement lists every HeartLink charge, and support can send a receipt for any payment. An in-app billing history view is on the way.',
      },
    ],
  },
  {
    key: 'safety',
    title: 'Safety & Verification',
    blurb: 'How profiles get here, and how we protect you.',
    cardBlurb: 'How verification works and how we keep you safe.',
    faqs: [
      {
        q: 'How are profiles verified?',
        a: 'Every profile starts as a paper application mailed from inside a facility. Our team reviews each application before it appears on HeartLink, and profiles that complete additional identity checks earn the gold Verified badge you see on cards. No one can create a profile from the internet.',
      },
      {
        q: 'Is my home address ever shared?',
        a: 'Letters are printed and mailed by our fulfillment partner, and replies come back to our processing center, not to your home. Never include personal details in a letter that you would not want the recipient to have.',
      },
      {
        q: 'How do I report a concern about a profile?',
        a: 'Contact support with the profile name and what you saw. Our team reviews every report, typically within 24 hours.',
      },
      {
        q: 'Can I stop hearing from someone?',
        a: 'Yes. Contact support and we will stop any further letters from that person reaching your mailbox.',
      },
      {
        q: 'What information can the other person see about me?',
        a: 'Only what you choose to put in your letters. Your address, email, and payment details are never shared.',
      },
    ],
  },
];

export const POPULAR_QUESTIONS: { topic: SupportTopicKey; q: string }[] = [
  { topic: 'letters', q: 'How long does it take for my letter to arrive?' },
  { topic: 'safety', q: 'How are profiles verified?' },
  { topic: 'billing', q: 'Can I get a refund on my plan?' },
];
