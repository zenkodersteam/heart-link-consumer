import type { FormSchema } from './types';

/**
 * Production intake form schema. Originally built against the draft PDF
 * (2026-04-21); VERIFIED against the FINAL 4-page form delivered 2026-06-17
 * (`docs/client-assets/HeartLink_Profile_Application_Final_4_Page_*.pdf`).
 *
 * ## Single-vs-multi: RESOLVED by the final form (verified 2026-06-18)
 *
 * The final form carries explicit control cues that confirm every
 * single-vs-multi default encoded below. No functional schema change was
 * needed (the "Legos" hot-swap guesses all held):
 *
 *   - i_am: "(select one)" -> single                       [confirmed]
 *   - kids: single (no multi cue)                          [confirmed]
 *   - political_views: single                              [confirmed]
 *   - love_language: single                                [confirmed]
 *   - future_expectations: single                          [confirmed]
 *   - type_of_connection: "(select up to 2)" -> multi/2    [confirmed]
 *   - emotional_intentions: "(select up to 3)" -> multi/3  [confirmed]
 *   - interested_in: "(select all that apply)" -> multi    [confirmed]
 *   - printed_name: present on the final signature block   [confirmed, keep]
 *
 * Caps still product-chosen (the form prints no number): values_and_lifestyle
 * (3), interests (5), languages_spoken (2). Reasonable, not form-violations.
 *
 * Communication preferences: the final form STILL combines channel + pace in
 * one "Communication Preferences" block (not split). Our two-field split
 * (communication_channels + communication_pace) aliases the combined label and
 * captures all six tokens, so it round-trips correctly.
 *
 * Final-form deltas vs this schema (both harmless, left in place):
 *   - "What I'm Looking For" (`seeking`) was folded into a single "About Me
 *     (Bio)" on the final form, so `seeking` has no matching label and simply
 *     never populates. Kept for forward-compat; safe to drop.
 *   - payment_method on the final form lists 4 options (Credit/Debit, Apple
 *     Pay, Google Pay, PayPal); "check" is no longer a self-select option. The
 *     enum keeps 'check' as a harmless value for mailed-payment handling.
 *
 * Pricing + bio word limits live in `packages/db/src/seed.ts`, updated to the
 * final form (Basic $30/200w, Diamond $45/300w, VIP $60/350w).
 *
 * ## Sensitive fields
 *
 *   - No fields currently carry `sensitive: true` in this schema. The
 *     `crime_incarcerated_for` and `on_death_row` fields are public per
 *     client decision on 2026-05-12 (reaffirmed; originally raised
 *     2026-04-28). The `sensitive` flag remains on FieldSpec for future use
 *     if other fields need to be admin-only.
 *
 * ## Declaration order
 *
 * `mapFormPairs` is first-match-wins. `full_name` is declared before
 * `printed_name` so that any "Name" / "Full Name" label claims the identity
 * field. Aliases are kept tight to prevent cross-matches.
 *
 * ## Confidence thresholds
 *
 * Free-text fields default to 0.75. Multi-select and boolean fields use
 * 0.6 because checkbox detection is noisier than printed text. Identity
 * fields critical for mail routing (full_name, inmate_id) use 0.85–0.9.
 * Tune against the first real Textract scan in M3 W6.
 */
export const PRODUCTION_INTAKE_FORM_V1: FormSchema = {
  version: 'production-v1',
  globalMinConfidence: 0.75,
  // Mirrors the comment-delimited blocks below (the PDF's printed sections).
  sections: [
    { title: 'Membership Plan Selection', firstKey: 'membership_plan' },
    { title: 'Verification & Applicant Information', firstKey: 'full_name' },
    { title: 'Communication Channels', firstKey: 'gtl_gettingout_id' },
    { title: 'Profile Details', firstKey: 'i_am' },
    { title: 'Payment & Photo Submission', firstKey: 'payment_method' },
    { title: 'Signature & Consent', firstKey: 'signature_present' },
    { title: 'Bio', firstKey: 'personal_statement' },
  ],
  fields: [
    // ───────────────────────────────────────────────────────────────
    // Page 1 — Membership Plan Selection
    // ───────────────────────────────────────────────────────────────
    {
      key: 'membership_plan',
      label: 'Membership Plan',
      aliases: ['Membership Plan Selection', 'Plan Selection'],
      required: true,
      minConfidence: 0.45,
      type: 'enum',
      enumValues: ['basic', 'diamond', 'vip'],
    },

    // ───────────────────────────────────────────────────────────────
    // Page 1 — Verification & Applicant Information
    // ───────────────────────────────────────────────────────────────
    {
      key: 'full_name',
      label: 'Full Legal Name',
      aliases: ['Full Name', 'Legal Name', 'Name'],
      required: true,
      minConfidence: 0.85,
      type: 'string',
    },
    {
      key: 'inmate_id',
      label: 'Inmate Number',
      aliases: ['Inmate Number / Book Number', 'Inmate Number / Booking Number', 'Book Number', 'Booking Number', 'Inmate ID', 'ID Number', 'DOC Number', 'Register Number'],
      required: true,
      minConfidence: 0.65,
      type: 'string',
    },
    {
      key: 'crime_incarcerated_for',
      label: 'Crime Incarcerated For',
      aliases: ['Crime', 'Offense', 'Offense Category'],
      required: false,
      type: 'string',
    },
    {
      key: 'date_of_birth',
      label: 'Date of Birth',
      aliases: ['DOB', 'Birthdate'],
      required: true,
      minConfidence: 0.85,
      type: 'date',
    },
    {
      key: 'sex',
      label: 'Sex',
      required: true,
      minConfidence: 0.6,
      type: 'enum',
      enumValues: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    {
      key: 'ethnicity',
      label: 'Ethnicity',
      aliases: ['Race', 'Race/Ethnicity'],
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      enumValues: [
        'white_caucasian',
        'black_african_american',
        'hispanic_latino',
        'asian',
        'native_american',
        'pacific_islander',
        'middle_eastern_n_african',
        'mixed',
        'other',
        'prefer_not_to_say',
      ],
    },
    {
      key: 'height_range',
      label: 'Height',
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      enumValues: [
        'under_5_0',
        '5_0_5_3',
        '5_4_5_6',
        '5_7_5_9',
        '5_10_6_0',
        '6_1_6_3',
        '6_4_plus',
      ],
    },
    {
      key: 'on_death_row',
      label: 'On Death Row?',
      aliases: ['Death Row'],
      required: false,
      minConfidence: 0.6,
      type: 'boolean',
    },
    {
      key: 'earliest_expected_release_date',
      label: 'Earliest Expected Release Date',
      aliases: ['Expected Release Date', 'Release Date', 'Projected Release'],
      required: false,
      type: 'date',
    },
    {
      key: 'facility_name',
      label: 'Facility Name',
      aliases: ['Prison', 'Institution', 'Correctional Facility'],
      required: true,
      minConfidence: 0.8,
      type: 'string',
    },
    {
      key: 'facility_city_state',
      label: 'Facility City, State',
      aliases: ['Facility City State'],
      required: true,
      type: 'string',
    },
    {
      key: 'facility_address_line_1',
      label: 'Facility Mailing Address (Line 1)',
      aliases: ['Facility Address Line 1'],
      required: true,
      type: 'string',
    },
    {
      key: 'facility_address_line_2',
      label: 'Facility Mailing Address (Line 2)',
      aliases: ['Facility Address Line 2'],
      required: false,
      type: 'string',
    },

    // ───────────────────────────────────────────────────────────────
    // Page 1 — Communication Channels
    // ───────────────────────────────────────────────────────────────
    {
      key: 'gtl_gettingout_id',
      label: 'GTL / GettingOut Account Information',
      aliases: ['GTL', 'GettingOut', 'GTL/GettingOut'],
      required: false,
      type: 'string',
    },
    {
      key: 'jpay_id',
      label: 'JPAY Account Information',
      aliases: ['JPAY', 'JPay'],
      required: false,
      type: 'string',
    },
    {
      key: 'corrlinks_id',
      label: 'CorrLinks Information',
      aliases: ['CorrLinks'],
      required: false,
      type: 'string',
    },
    {
      key: 'trulincs_id',
      label: 'TRULINCS / Federal Messaging Information',
      aliases: ['TRULINCS', 'Federal Messaging'],
      required: false,
      type: 'string',
    },
    {
      key: 'phone_video_availability',
      label: 'Phone / Video Availability',
      aliases: ['Phone Availability', 'Video Availability'],
      required: false,
      type: 'string',
    },
    {
      key: 'email_or_message_username',
      label: 'Email or Message Username / ID',
      aliases: ['Email Username', 'Message Username', 'Message ID'],
      required: false,
      type: 'string',
    },
    {
      key: 'physical_mail_only',
      label: 'Physical Mail Only?',
      aliases: ['Physical Mail Only'],
      required: false,
      minConfidence: 0.6,
      type: 'boolean',
    },
    {
      key: 'alternate_contact',
      label: 'Alternate Contact',
      aliases: ['Alternate Contact (If Applicable)'],
      required: false,
      type: 'string',
    },

    // ───────────────────────────────────────────────────────────────
    // Page 2 — Profile Details
    // ───────────────────────────────────────────────────────────────
    {
      key: 'i_am',
      label: 'I Am',
      aliases: ['Orientation', 'Identity'],
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      enumValues: [
        'straight_woman',
        'straight_man',
        'gay_man',
        'lesbian',
        'bisexual_man',
        'bisexual_woman',
        'non_binary',
        'other',
        'prefer_not_to_say',
      ],
    },
    {
      key: 'religion',
      label: 'Religion',
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      enumValues: [
        'christian',
        'catholic',
        'muslim',
        'jewish',
        'hindu',
        'buddhist',
        'spiritual',
        'agnostic',
        'atheist',
        'other',
        'prefer_not_to_say',
      ],
    },
    {
      key: 'exercise_frequency',
      label: 'Exercise?',
      aliases: ['Exercise', 'Exercise Frequency'],
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      enumValues: ['never', 'sometimes', 'regularly', 'daily'],
    },
    {
      key: 'highest_education',
      label: 'Highest Education',
      aliases: ['Education', 'Highest Level of Education'],
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      enumValues: [
        'some_hs',
        'hs_ged',
        'some_college',
        'associates',
        'bachelors',
        'masters',
        'doctorate',
        'trade_vocational',
      ],
    },
    {
      key: 'languages_spoken',
      label: 'Languages Spoken',
      aliases: ['Languages'],
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      multi: true,
      maxSelections: 2,
      enumValues: [
        'english',
        'spanish',
        'french',
        'german',
        'portuguese',
        'chinese',
        'arabic',
        'sign_language',
        'other',
      ],
    },
    {
      key: 'type_of_connection',
      label: 'Type of Connection',
      aliases: ['Connection Type'],
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      multi: true,
      maxSelections: 2,
      enumValues: [
        'pen_pal',
        'friendship',
        'emotional_support',
        'serious_relationship',
        'marriage_minded',
        'faith_based',
      ],
    },
    {
      key: 'relationship_pace',
      label: 'Relationship Pace',
      aliases: ['Pace'],
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      enumValues: ['very_slow', 'slow', 'moderate', 'fast'],
    },
    {
      // Final form (2026-06-17): multi confirmed; no printed cap, max 3 is a
      // product choice.
      key: 'values_and_lifestyle',
      label: 'Values & Lifestyle',
      aliases: ['Values', 'Lifestyle'],
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      multi: true,
      maxSelections: 3,
      enumValues: [
        'family_oriented',
        'faith_spirituality',
        'personal_growth',
        'loyalty',
        'humor',
        'health_fitness',
        'education',
        'second_chance_mindset',
      ],
    },
    {
      key: 'interested_in',
      label: 'Interested In',
      aliases: ['Interested'],
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      multi: true,
      maxSelections: 4,
      enumValues: ['men', 'women', 'non_binary', 'everyone'],
    },
    {
      key: 'tattoos',
      label: 'Tattoos',
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      enumValues: ['none', 'a_few', 'many', 'heavily_tattooed'],
    },
    {
      // Final form (2026-06-17): single confirmed (no multi cue).
      key: 'kids',
      label: 'Kids',
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      enumValues: ['no_kids', 'have_kids', 'want_kids', 'do_not_want_kids', 'open'],
    },
    {
      // Final form (2026-06-17): single confirmed.
      key: 'political_views',
      label: 'Political Views',
      aliases: ['Politics'],
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      enumValues: [
        'liberal',
        'conservative',
        'moderate',
        'libertarian',
        'progressive',
        'apolitical',
        'other',
        'prefer_not_to_say',
      ],
    },
    {
      // Single-select: matches Hinge/Tinder/Bumble convention for this field.
      // Chapman's framework discusses "primary + secondary" but consumer-facing
      // apps that surface love language all use single-select for profile
      // legibility. Revisit if the client wants multi on 2026-04-28.
      key: 'love_language',
      label: 'Love Language',
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      enumValues: [
        'words_of_affirmation',
        'quality_time',
        'gifts',
        'acts_of_service',
        'physical_touch',
      ],
    },
    {
      key: 'currently_in_school',
      label: 'Currently in School?',
      aliases: ['In School'],
      required: false,
      minConfidence: 0.6,
      type: 'boolean',
    },
    {
      // Final form (2026-06-17): multi confirmed; no printed cap, max 5 is a
      // product choice.
      key: 'interests',
      label: 'Interests',
      aliases: ['Hobbies'],
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      multi: true,
      maxSelections: 5,
      enumValues: [
        'music',
        'movies',
        'books',
        'sports',
        'cooking',
        'art',
        'fitness',
        'gaming',
        'nature',
        'writing',
        'meditation',
        'tech',
      ],
    },
    // Split from the PDF's single "Communication Preferences" row, which mixes
    // two orthogonal axes (channel + pace). Storing combined tokens in one
    // multi-select made compound preferences like "Letters + Frequent" and
    // "Phone + Slow OK" indistinguishable from contradictions once serialized.
    // Raised as form-design feedback for 2026-04-28. The `communication_channels`
    // alias catches the current combined label; pace tokens end up in
    // MapResult.reasons as unrecognized-enum-token until the client splits
    // the physical form.
    {
      key: 'communication_channels',
      label: 'Communication Channels',
      aliases: ['Communication Preferences', 'Channels', 'Communication Prefs', 'Comm Preferences'],
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      multi: true,
      maxSelections: 4,
      enumValues: ['letters_mail', 'app_messaging', 'phone_calls', 'video_visits'],
    },
    {
      key: 'communication_pace',
      label: 'Communication Pace',
      aliases: ['Pace', 'Frequency', 'Communication Frequency'],
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      enumValues: ['slow_ok', 'frequent'],
    },
    {
      // TODO(ADR-013, demo-2026-04-28): confirm single vs multi.
      // Current guess: single ("Unsure" reads like a catch-all).
      key: 'future_expectations',
      label: 'Future Expectations',
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      enumValues: [
        'during_incarceration_only',
        'open_after_release',
        'marriage_potential',
        'unsure',
      ],
    },
    {
      key: 'emotional_intentions',
      label: 'Emotional Intentions',
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      multi: true,
      maxSelections: 3,
      enumValues: [
        'regular_conversation',
        'companionship',
        'motivation_growth',
        'fun_light',
        'deep_connection',
        'emotional_support',
        'spiritual_connection',
        'future_planning',
      ],
    },

    // ───────────────────────────────────────────────────────────────
    // Page 2 — Payment & Photo Submission
    // ───────────────────────────────────────────────────────────────
    {
      key: 'payment_method',
      label: 'Payment Method',
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      enumValues: ['check', 'credit_debit', 'apple_pay', 'google_pay', 'paypal', 'facility_money_order', 'facility_check', 'gifted_from_outside'],
    },
    {
      key: 'payer_name_if_different',
      label: 'Payer Name (If Different)',
      aliases: ['Payer Name'],
      required: false,
      type: 'string',
    },
    {
      key: 'payer_email_phone',
      label: 'Payer Email / Phone',
      aliases: ['Payer Email', 'Payer Phone'],
      required: false,
      type: 'string',
    },
    {
      key: 'number_of_photos_attached',
      label: 'Number of Photos Attached',
      aliases: ['Photo Count'],
      required: false,
      type: 'number',
    },
    {
      key: 'photo_submission_method',
      label: 'Photo Submission Method',
      aliases: ['Photo Method'],
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      enumValues: ['phone', 'email', 'mail'],
    },
    {
      key: 'photo_numbers_included',
      label: 'Photo Numbers Included',
      aliases: ['Photo Numbers', 'Photos Included'],
      required: false,
      minConfidence: 0.6,
      type: 'enum',
      multi: true,
      maxSelections: 6,
      enumValues: ['1', '2', '3', '4', '5', '6'],
    },
    {
      key: 'other_payment_notes',
      label: 'Other Payment Notes',
      aliases: ['Payment Notes'],
      required: false,
      type: 'string',
      multiLine: true,
    },

    // ───────────────────────────────────────────────────────────────
    // Page 2 — Signature & Consent
    // ───────────────────────────────────────────────────────────────
    {
      key: 'signature_present',
      label: 'Applicant Signature',
      aliases: [],
      required: true,
      minConfidence: 0.0, // presence-only; OCR confidence on a signature block is meaningless
      type: 'boolean',
    },
    {
      key: 'signature_date',
      label: 'Signature Date',
      aliases: ['Date Signed', 'Date'],
      required: true,
      minConfidence: 0.8,
      type: 'date',
    },
    {
      // Final form (2026-06-17): present as a distinct field on the signature
      // block. Keep separate from full_name.
      key: 'printed_name',
      label: 'Printed Name',
      required: false,
      type: 'string',
    },

    // ───────────────────────────────────────────────────────────────
    // Page 3 — Bio
    // ───────────────────────────────────────────────────────────────
    {
      key: 'personal_statement',
      label: 'About Me',
      aliases: ['About Me (Bio)', 'About Me Continued', 'Bio', 'Personal Statement', 'Biography'],
      required: false,
      type: 'string',
      multiLine: true,
    },
    {
      key: 'seeking',
      label: "What I'm Looking For",
      aliases: ['Looking For', 'What I Am Looking For', 'Seeking'],
      required: false,
      type: 'string',
      multiLine: true,
    },
  ],
};
