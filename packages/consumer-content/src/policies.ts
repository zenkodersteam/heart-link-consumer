/**
 * Terms of Service and Privacy Policy text.
 *
 * PLACEHOLDER — NOT LEGAL COPY. These summarise how HeartLink actually behaves
 * so the screens, the sign-up acceptance step and store review have something
 * truthful to show, but they have not been written or reviewed by a lawyer and
 * must be replaced before launch.
 *
 * The version strings must match CURRENT_TERMS_VERSION / CURRENT_PRIVACY_VERSION
 * on the server: consent is recorded against a version, and a mismatch means
 * members are asked to accept again.
 */
export const TERMS_VERSION = '2026-09-04';
export const PRIVACY_VERSION = '2026-09-04';

export interface PolicySection {
  heading: string;
  body: string;
}

export const PLACEHOLDER_NOTICE =
  'This is a plain-English summary and not the final legal wording. It will be replaced before launch.';

export const TERMS_SECTIONS: PolicySection[] = [
  {
    heading: 'Who can use HeartLink',
    body: 'You must be 18 or over to hold an account. Profiles of incarcerated members are created from paper applications received from a facility; no one can create such a profile online.',
  },
  {
    heading: 'Letters',
    body: 'Letters you write are reviewed by our team before they are printed and posted to a facility. We may decline to send a letter that breaks a facility rule or these terms. If a letter is declined it is not sent and the letter you spent is returned to you.',
  },
  {
    heading: 'Plans and payment',
    body: 'Plans renew automatically until cancelled. Letters included with a plan refresh each billing period and do not roll over. Letters you buy separately do not expire.',
  },
  {
    heading: 'Behaviour',
    body: 'Do not send content that is threatening, harassing, sexually explicit, or intended to arrange anything unlawful. Do not impersonate anyone or misrepresent who you are. We may suspend or close an account that does.',
  },
  {
    heading: 'Closing your account',
    body: 'You can close your account at any time from the account screen. Your sign-in is removed and your personal details are erased. Records of payments are kept, because we are required to retain them.',
  },
];

export const PRIVACY_SECTIONS: PolicySection[] = [
  {
    heading: 'What we hold',
    body: 'Your name, email address, and anything you add to your profile. If you write letters, we hold their contents so they can be reviewed, printed and posted. If you pay, our payment provider handles your card details and we never see them.',
  },
  {
    heading: 'Letters and privacy',
    body: 'Letters are not private between you and the recipient alone. Our team reviews outgoing letters before posting, and scans replies so they appear in your mailbox. Facility staff may also read mail under their own rules.',
  },
  {
    heading: 'Who else sees your information',
    body: 'Our team, so they can review letters and run the service. Our printing and postal partner, to post your letters. Our payment provider, to take payment. We do not sell your information.',
  },
  {
    heading: 'Keeping and deleting',
    body: 'We keep your information while your account is open. When you close it we erase your personal details, but retain records of payments as the law requires. Letters already sent remain part of the recipient’s correspondence.',
  },
  {
    heading: 'Your choices',
    body: 'You can view and change your profile, block or report another member, and close your account at any time from within the app.',
  },
];
