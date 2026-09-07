import type { FormSchema } from './types';

/**
 * Provisional intake form schema for HeartLink.
 *
 * The client has not yet delivered the draft application PDF, so this schema
 * is a best-guess derived from typical inmate pen-pal / connectivity intake
 * forms. It covers identity, contact/mailing, demographics, incarceration
 * details, profile content, and signature/consent.
 *
 * When the client delivers the real form, two options:
 *   1. Edit this file in place — adjust labels, aliases, thresholds.
 *   2. Add `production-v1.ts` and re-point `ACTIVE_FORM_SCHEMA` in `index.ts`.
 *
 * Either way, no DB migration is needed — `documents.ocrExtractedFields` is
 * JSONB keyed by `FieldSpec.key`.
 */
export const PROVISIONAL_INTAKE_FORM_V1: FormSchema = {
  version: 'provisional-v1',
  globalMinConfidence: 0.8,
  fields: [
    // Identity
    {
      key: 'full_name',
      label: 'Full Name',
      aliases: ['Name', 'Full legal name', 'Legal name'],
      required: true,
      minConfidence: 0.85,
      type: 'string',
    },
    {
      key: 'date_of_birth',
      label: 'Date of Birth',
      aliases: ['DOB', 'Birthdate', 'Date of birth'],
      required: true,
      minConfidence: 0.85,
      type: 'date',
    },
    {
      key: 'inmate_id',
      label: 'Inmate ID',
      aliases: ['Inmate Number', 'ID Number', 'DOC Number', 'Register Number'],
      required: true,
      minConfidence: 0.9, // critical for mail routing
      type: 'string',
    },
    {
      key: 'facility_name',
      label: 'Facility Name',
      aliases: ['Prison', 'Institution', 'Correctional Facility', 'Facility'],
      required: true,
      minConfidence: 0.8,
      type: 'string',
    },

    // Contact / Mailing
    {
      key: 'mailing_address',
      label: 'Mailing Address',
      aliases: ['Address', 'Mail to'],
      required: true,
      minConfidence: 0.8,
      type: 'string',
      multiLine: true,
    },
    {
      key: 'housing_unit',
      label: 'Housing Unit',
      aliases: ['Unit', 'Pod', 'Block'],
      required: false,
      type: 'string',
    },

    // Demographics
    { key: 'height', label: 'Height', required: false, minConfidence: 0.7, type: 'string' },
    { key: 'weight', label: 'Weight', required: false, minConfidence: 0.7, type: 'string' },
    { key: 'eye_color', label: 'Eye Color', required: false, minConfidence: 0.7, type: 'string' },
    { key: 'hair_color', label: 'Hair Color', required: false, minConfidence: 0.7, type: 'string' },
    {
      key: 'race',
      label: 'Race',
      aliases: ['Ethnicity', 'Race/Ethnicity'],
      required: false,
      minConfidence: 0.7,
      type: 'string',
    },
    { key: 'religion', label: 'Religion', required: false, type: 'string' },

    // Incarceration details
    {
      key: 'sentence_start_date',
      label: 'Sentence Start',
      aliases: ['Incarceration Date', 'Sentence Start Date'],
      required: false,
      type: 'date',
    },
    {
      key: 'expected_release_date',
      label: 'Expected Release',
      aliases: ['Release Date', 'Projected Release', 'Expected Release Date'],
      required: false,
      type: 'date',
    },
    {
      key: 'offense_category',
      label: 'Offense',
      aliases: ['Category', 'Crime Category'],
      required: false,
      type: 'string',
    },

    // Profile content
    {
      key: 'interests',
      label: 'Interests',
      aliases: ['Hobbies', 'Interests and hobbies'],
      required: false,
      type: 'string',
      multiLine: true,
    },
    {
      key: 'personal_statement',
      label: 'About Me',
      aliases: ['Personal Statement', 'Biography', 'Bio', 'About'],
      required: false,
      type: 'string',
      multiLine: true,
    },
    {
      key: 'seeking',
      label: 'Seeking',
      aliases: ['Looking for', 'What I am looking for'],
      required: false,
      type: 'string',
      multiLine: true,
    },

    // Signature / consent
    {
      key: 'signature_present',
      label: 'Signature',
      required: true,
      minConfidence: 0.0, // presence-only; OCR confidence on a signature block is meaningless
      type: 'boolean',
    },
    {
      key: 'signature_date',
      label: 'Date Signed',
      aliases: ['Signature Date', 'Date'],
      required: true,
      minConfidence: 0.8,
      type: 'date',
    },
  ],
};
