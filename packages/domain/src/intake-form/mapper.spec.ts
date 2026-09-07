import { mapFormPairs } from './mapper';
import { PRODUCTION_INTAKE_FORM_V1 } from './production-v1';
import type { FormSchema } from './types';
import type { OcrFormPair } from '../ocr/types';

function pair(key: string, value: string, conf = 0.95): OcrFormPair {
  return { key, value, keyConfidence: conf, valueConfidence: conf };
}

/**
 * Happy-path fixture: all production-v1 required fields present with high
 * confidence. Uses the labels / enum values the mapper would canonicalize to.
 */
function allRequiredHighConfidence(): OcrFormPair[] {
  return [
    pair('Membership Plan', 'diamond'),
    pair('Full Legal Name', 'John Doe'),
    pair('Inmate Number', 'A1234567'),
    pair('Date of Birth', '01/15/1985'),
    pair('Sex', 'male'),
    pair('Facility Name', 'Texas State Prison'),
    pair('Facility City, State', 'Austin, TX'),
    pair('Facility Mailing Address (Line 1)', '100 Prison Rd'),
    pair('Applicant Signature', 'Signed'),
    pair('Signature Date', '03/20/2026'),
  ];
}

describe('mapFormPairs against PRODUCTION_INTAKE_FORM_V1', () => {
  it('happy path: no required flagged, needsManualReview=false', () => {
    const result = mapFormPairs(allRequiredHighConfidence(), PRODUCTION_INTAKE_FORM_V1);

    expect(result.schemaVersion).toBe('production-v1');
    expect(result.needsManualReview).toBe(false);
    expect(result.reasons).toEqual([]);

    const byKey = Object.fromEntries(result.fields.map((f) => [f.key, f]));
    expect(byKey.full_name.value).toBe('John Doe');
    expect(byKey.inmate_id.value).toBe('A1234567');
    expect(byKey.inmate_id.flagged).toBe(false);
    expect(byKey.signature_present.value).toBe('true');
    expect(byKey.membership_plan.value).toBe('diamond');
  });

  it('alias matching: DOB, Book Number, Facility City State, etc. resolve', () => {
    const pairs: OcrFormPair[] = [
      pair('Plan Selection', 'basic'),
      pair('Name', 'Jane Roe'),
      pair('Book Number', 'B9876543'),
      pair('DOB', '06/12/1990'),
      pair('Sex', 'female'),
      pair('Institution', 'Coldwater Correctional'),
      pair('City, State', 'Coldwater, MI'),
      pair('Mailing Address', '42 Wayne St'),
      pair('Signature', 'Signed'),
      pair('Date Signed', '03/21/2026'),
    ];
    const result = mapFormPairs(pairs, PRODUCTION_INTAKE_FORM_V1);
    const byKey = Object.fromEntries(result.fields.map((f) => [f.key, f]));
    expect(byKey.full_name.value).toBe('Jane Roe');

    expect(byKey.date_of_birth.value).toBe('06/12/1990');
    expect(byKey.date_of_birth.matchedLabel).toBe('DOB');
    expect(byKey.inmate_id.matchedLabel).toBe('Book Number');
    expect(byKey.facility_name.matchedLabel).toBe('Institution');
    expect(byKey.facility_city_state.matchedLabel).toBe('City, State');
    expect(byKey.facility_address_line_1.matchedLabel).toBe('Mailing Address');
    expect(byKey.signature_date.matchedLabel).toBe('Date Signed');
    expect(result.needsManualReview).toBe(false);
  });

  it('missing required field is flagged and drives needsManualReview', () => {
    const pairs = allRequiredHighConfidence().filter((p) => p.key !== 'Inmate Number');
    const result = mapFormPairs(pairs, PRODUCTION_INTAKE_FORM_V1);

    const inmateId = result.fields.find((f) => f.key === 'inmate_id')!;
    expect(inmateId.missing).toBe(true);
    expect(inmateId.flagged).toBe(true);
    expect(result.needsManualReview).toBe(true);
    expect(result.reasons.some((r) => r.includes('inmate_id'))).toBe(true);
  });

  it('required field below minConfidence is flagged', () => {
    // inmate_id threshold is 0.65; give it 0.60.
    const pairs = allRequiredHighConfidence().map((p) =>
      p.key === 'Inmate Number' ? pair(p.key, p.value, 0.6) : p,
    );
    const result = mapFormPairs(pairs, PRODUCTION_INTAKE_FORM_V1);

    const inmateId = result.fields.find((f) => f.key === 'inmate_id')!;
    expect(inmateId.missing).toBe(false);
    expect(inmateId.belowThreshold).toBe(true);
    expect(inmateId.flagged).toBe(true);
    expect(result.needsManualReview).toBe(true);
    expect(result.reasons.some((r) => r.includes('inmate_id'))).toBe(true);
    expect(result.reasons.some((r) => r.includes('0.60'))).toBe(true);
  });

  it('optional field below threshold is NOT flagged', () => {
    // crime_incarcerated_for is optional. Give it a low-confidence value.
    const pairs = [
      ...allRequiredHighConfidence(),
      pair('Crime Incarcerated For', 'Aggravated Assault', 0.5),
    ];
    const result = mapFormPairs(pairs, PRODUCTION_INTAKE_FORM_V1);

    const crime = result.fields.find((f) => f.key === 'crime_incarcerated_for')!;
    expect(crime.belowThreshold).toBe(true);
    expect(crime.flagged).toBe(false);
    expect(result.needsManualReview).toBe(false);
  });

  it('signature presence check: empty value is flagged as unsigned', () => {
    const pairs = allRequiredHighConfidence().map((p) =>
      p.key === 'Applicant Signature' ? pair('Applicant Signature', '') : p,
    );
    const result = mapFormPairs(pairs, PRODUCTION_INTAKE_FORM_V1);

    const signature = result.fields.find((f) => f.key === 'signature_present')!;
    expect(signature.value).toBe('false');
    expect(signature.flagged).toBe(true);
    expect(result.needsManualReview).toBe(true);
    expect(result.reasons.some((r) => r.includes('signature_present'))).toBe(true);
  });

  it('unmatched pairs appear in rawUnmatched and do not break mapping', () => {
    const pairs = [
      ...allRequiredHighConfidence(),
      pair('Favorite Color', 'Purple'),
      pair('Shoe Size', '11'),
    ];
    const result = mapFormPairs(pairs, PRODUCTION_INTAKE_FORM_V1);

    expect(result.needsManualReview).toBe(false);
    expect(result.rawUnmatched).toHaveLength(2);
    expect(result.rawUnmatched.map((p) => p.key)).toEqual(
      expect.arrayContaining(['Favorite Color', 'Shoe Size']),
    );
  });

  it('normalization: case + punctuation differences still match', () => {
    const pairs: OcrFormPair[] = [
      pair('MEMBERSHIP PLAN', 'vip'),
      pair('FULL LEGAL NAME', 'Alex Casey'),
      pair('inmate-number', 'C5551212'),
      pair('d.o.b.', '11/11/1991'),
      pair('sex', 'other'),
      pair('Facility-Name', 'Walls Unit'),
      pair('facility city state', 'Huntsville, TX'),
      pair('Facility Mailing Address Line 1', 'PO Box 1'),
      pair('signature', 'X'),
      pair('signature-date', '03/21/2026'),
    ];
    const result = mapFormPairs(pairs, PRODUCTION_INTAKE_FORM_V1);
    expect(result.needsManualReview).toBe(false);
  });

  it('substring labels still match when Textract appends helper text', () => {
    const pairs: OcrFormPair[] = [
      pair('Membership Plan Selection', 'diamond'),
      pair('Full Legal Name (Print Clearly)', 'Alex Casey'),
      pair('Inmate Number / Booking Number', 'C5551212'),
      pair('DATE OF BIRTH (MM/DD/YYYY)', '11/11/1991'),
      pair('Facility City, State', 'Huntsville, TX'),
      pair('Facility Mailing Address (Line 1)', 'PO Box 1'),
      pair('Applicant Signature', 'Signed'),
      pair('Signature Date', '03/21/2026'),
    ];
    const result = mapFormPairs(pairs, PRODUCTION_INTAKE_FORM_V1);
    const byKey = Object.fromEntries(result.fields.map((f) => [f.key, f]));
    expect(byKey.membership_plan.value).toBe('diamond');
    expect(byKey.full_name.value).toBe('Alex Casey');
    expect(byKey.inmate_id.value).toBe('C5551212');
    expect(byKey.date_of_birth.value).toBe('11/11/1991');
  });

  it('prefers a non-empty inmate match over an earlier empty booking-number fragment', () => {
    const pairs: OcrFormPair[] = [
      pair('Booking Number', '', 0.87),
      pair('Inmate Number', 'A10002', 0.85),
      pair('Full Legal Name', 'Alex Casey'),
      pair('Date of Birth', '11/11/1991'),
      pair('Sex', 'female'),
      pair('Facility Name', 'Walls Unit'),
      pair('Facility City, State', 'Huntsville, TX'),
      pair('Facility Mailing Address (Line 1)', 'PO Box 1'),
      pair('Applicant Signature', 'Signed'),
      pair('Signature Date', '03/21/2026'),
      pair('Membership Plan', 'vip'),
    ];
    const result = mapFormPairs(pairs, PRODUCTION_INTAKE_FORM_V1);
    const byKey = Object.fromEntries(result.fields.map((f) => [f.key, f]));
    expect(byKey.inmate_id.value).toBe('A10002');
    expect(byKey.inmate_id.matchedLabel).toBe('Inmate Number');
    expect(byKey.inmate_id.flagged).toBe(false);
    expect(result.needsManualReview).toBe(false);
  });

  it('long instructional text mentioning a field does not steal the match', () => {
    const pairs: OcrFormPair[] = [
      pair(
        'Select one plan. All plans include a 1-year subscription, multiple payment options.',
        '',
      ),
      pair('Basic', 'X'),
      pair('Full Legal Name', 'Alex Casey'),
      pair('Inmate Number', 'C5551212'),
      pair('Date of Birth', '11/11/1991'),
      pair('Facility Name', 'Walls Unit'),
      pair('Facility City, State', 'Huntsville, TX'),
      pair('Facility Mailing Address (Line 1)', 'PO Box 1'),
      pair('Applicant Signature', 'Signed'),
      pair('Signature Date', '03/21/2026'),
    ];
    const result = mapFormPairs(pairs, PRODUCTION_INTAKE_FORM_V1);
    const byKey = Object.fromEntries(result.fields.map((f) => [f.key, f]));
    expect(byKey.membership_plan.value).toBe('basic');
    expect(byKey.membership_plan.matchedLabel).toBe('[selection-driven]');
  });

  it('multiline fields prefer the longer non-empty candidate when labels collide', () => {
    const result = mapFormPairs(
      [
        pair('About Me', 'Short fragment', 0.99),
        pair(
          'About Me Continued',
          'I value loyalty, honesty, and growth. I like music, books, writing, and real conversation.',
          0.97,
        ),
      ],
      {
        version: 'test-personal-statement',
        globalMinConfidence: 0.6,
        fields: [
          PRODUCTION_INTAKE_FORM_V1.fields.find((f) => f.key === 'personal_statement')!,
        ],
      },
    );

    const field = result.fields[0];
    expect(field.value).toBe(
      'I value loyalty, honesty, and growth. I like music, books, writing, and real conversation.',
    );
    expect(field.matchedLabel).toBe('About Me Continued');
  });

  it('selection-driven enum fallback maps checkbox/radio option labels directly', () => {
    const pairs: OcrFormPair[] = [
      pair('Basic', 'X'),
      pair('Male', 'X'),
      pair('Black / African American', 'X'),
      pair('5\'7"- 5\'9"', 'X'),
      pair('Women', 'X'),
      pair('PayPal', 'X'),
      pair('Signature Date', '03/21/2026'),
      pair('Applicant Signature', 'Signed'),
      pair('Full Legal Name', 'Alex Casey'),
      pair('Inmate Number', 'C5551212'),
      pair('Facility Name', 'Walls Unit'),
      pair('Facility City, State', 'Huntsville, TX'),
      pair('Facility Mailing Address (Line 1)', 'PO Box 1'),
      pair('Date of Birth', '11/11/1991'),
    ];
    const result = mapFormPairs(pairs, PRODUCTION_INTAKE_FORM_V1);
    const byKey = Object.fromEntries(result.fields.map((f) => [f.key, f]));
    expect(byKey.membership_plan.value).toBe('basic');
    expect(byKey.sex.value).toBe('male');
    expect(byKey.ethnicity.value).toBe('black_african_american');
    expect(byKey.height_range.value).toBe('5_7_5_9');
    expect(byKey.interested_in.value).toEqual(['women']);
    expect(byKey.payment_method.value).toBe('paypal');
  });

  it('selection-driven membership fallback can infer the plan from OCRed pricing text', () => {
    const pairs: OcrFormPair[] = [
      pair('PROFILE LENGTH', 'X $30 / 200 words'),
      pair('Full Legal Name', 'Alex Casey'),
      pair('Inmate Number', 'C5551212'),
      pair('Date of Birth', '11/11/1991'),
      pair('Facility Name', 'Walls Unit'),
      pair('Facility City, State', 'Huntsville, TX'),
      pair('Facility Mailing Address (Line 1)', 'PO Box 1'),
      pair('Applicant Signature', 'Signed'),
      pair('Signature Date', '03/21/2026'),
    ];
    const result = mapFormPairs(pairs, PRODUCTION_INTAKE_FORM_V1);
    const byKey = Object.fromEntries(result.fields.map((f) => [f.key, f]));
    expect(byKey.membership_plan.value).toBe('basic');
    expect(byKey.membership_plan.matchedLabel).toBe('[selection-driven]');
  });

  it('empty input: every required field flagged', () => {
    const result = mapFormPairs([], PRODUCTION_INTAKE_FORM_V1);
    expect(result.needsManualReview).toBe(true);

    const required = PRODUCTION_INTAKE_FORM_V1.fields.filter((f) => f.required);
    for (const f of required) {
      const extracted = result.fields.find((x) => x.key === f.key)!;
      expect(extracted.missing).toBe(true);
      expect(extracted.flagged).toBe(true);
    }
    for (const f of required) {
      expect(result.reasons.some((r) => r.includes(f.key))).toBe(true);
    }
  });
});

describe('mapFormPairs — multi-select', () => {
  const baseSchema: FormSchema = {
    version: 'test-multi',
    globalMinConfidence: 0.6,
    fields: [
      {
        key: 'langs',
        label: 'Languages',
        required: false,
        type: 'enum',
        multi: true,
        maxSelections: 2,
        enumValues: ['english', 'spanish', 'french', 'german'],
      },
    ],
  };

  it('single-value multi: returns a single-element array', () => {
    const result = mapFormPairs([pair('Languages', 'English')], baseSchema);
    const f = result.fields[0];
    expect(f.value).toEqual(['english']);
    expect(f.missing).toBe(false);
  });

  it('comma-separated: returns an array of canonical values', () => {
    const result = mapFormPairs([pair('Languages', 'English, Spanish')], baseSchema);
    expect(result.fields[0].value).toEqual(['english', 'spanish']);
  });

  it('slash / "and" / semicolon separators all work', () => {
    const r1 = mapFormPairs([pair('Languages', 'English/Spanish')], baseSchema);
    expect(r1.fields[0].value).toEqual(['english', 'spanish']);
    const r2 = mapFormPairs([pair('Languages', 'English and French')], baseSchema);
    expect(r2.fields[0].value).toEqual(['english', 'french']);
    const r3 = mapFormPairs([pair('Languages', 'English; German')], baseSchema);
    expect(r3.fields[0].value).toEqual(['english', 'german']);
  });

  it('maxSelections: over-limit values are truncated and recorded in reasons', () => {
    const result = mapFormPairs(
      [pair('Languages', 'English, Spanish, French')],
      baseSchema,
    );
    expect(result.fields[0].value).toEqual(['english', 'spanish']);
    expect(result.reasons.some((r) => r.includes('maxSelections'))).toBe(true);
  });

  it('empty multi after parsing is treated as missing', () => {
    const result = mapFormPairs([pair('Languages', '')], baseSchema);
    const f = result.fields[0];
    expect(f.value).toBeNull();
    expect(f.missing).toBe(true);
  });

  it('unknown enum tokens are recorded in reasons but do not prevent known ones', () => {
    const result = mapFormPairs(
      [pair('Languages', 'English, Klingon')],
      baseSchema,
    );
    expect(result.fields[0].value).toEqual(['english']);
    expect(result.reasons.some((r) => r.toLowerCase().includes('unrecognized'))).toBe(true);
  });

  it('required multi that ends up empty flags the row', () => {
    const requiredSchema: FormSchema = {
      ...baseSchema,
      fields: [{ ...baseSchema.fields[0], required: true }],
    };
    const result = mapFormPairs([pair('Languages', '')], requiredSchema);
    expect(result.needsManualReview).toBe(true);
    expect(result.fields[0].flagged).toBe(true);
  });

  it('normalizes enum tokens: "SIGN_LANGUAGE", "sign language", "Sign-Language" all match', () => {
    const schema: FormSchema = {
      version: 'test-multi-norm',
      globalMinConfidence: 0.6,
      fields: [
        {
          key: 'langs',
          label: 'Languages',
          required: false,
          type: 'enum',
          multi: true,
          enumValues: ['sign_language'],
        },
      ],
    };
    const r = mapFormPairs([pair('Languages', 'Sign Language')], schema);
    expect(r.fields[0].value).toEqual(['sign_language']);
  });
});

describe('mapFormPairs — enum (single-select) normalization', () => {
  const schema: FormSchema = {
    version: 'test-enum',
    globalMinConfidence: 0.6,
    fields: [
      {
        key: 'plan',
        label: 'Plan',
        required: true,
        type: 'enum',
        enumValues: ['basic', 'diamond', 'vip'],
      },
    ],
  };

  it('exact match canonicalizes to enum value', () => {
    const r = mapFormPairs([pair('Plan', 'diamond')], schema);
    expect(r.fields[0].value).toBe('diamond');
    expect(r.fields[0].belowThreshold).toBe(false);
  });

  it('case-insensitive match also canonicalizes', () => {
    const r = mapFormPairs([pair('Plan', 'DIAMOND')], schema);
    expect(r.fields[0].value).toBe('diamond');
  });

  it('no enum match: raw value retained but flagged below threshold', () => {
    const r = mapFormPairs([pair('Plan', 'gold')], schema);
    expect(r.fields[0].value).toBe('gold');
    expect(r.fields[0].belowThreshold).toBe(true);
    expect(r.fields[0].flagged).toBe(true);
    expect(r.needsManualReview).toBe(true);
  });
});

describe('mapFormPairs — hot-swap invariant', () => {
  /**
   * Proves the Lego promise: a brand-new, never-before-seen multi-select
   * field added to a schema round-trips through the mapper with no code
   * changes. If this test ever breaks, the hot-swap contract is broken.
   */
  it('arbitrary new multi-select field round-trips cleanly', () => {
    const schema: FormSchema = {
      version: 'hot-swap-demo',
      globalMinConfidence: 0.6,
      fields: [
        {
          key: 'demo_hot_swap',
          label: 'Hot Swap Test',
          required: false,
          type: 'enum',
          multi: true,
          maxSelections: 3,
          enumValues: ['alpha', 'beta', 'gamma', 'delta'],
        },
      ],
    };
    const result = mapFormPairs(
      [pair('Hot Swap Test', 'Alpha, Gamma')],
      schema,
    );
    expect(result.schemaVersion).toBe('hot-swap-demo');
    expect(result.fields[0].value).toEqual(['alpha', 'gamma']);
    expect(result.fields[0].flagged).toBe(false);
  });

  it('first-match-wins: earlier schema field claims a pair before later field can match it', () => {
    const schema: FormSchema = {
      version: 'test-first-match',
      globalMinConfidence: 0.8,
      fields: [
        { key: 'primary_address', label: 'Address', required: true, type: 'string' },
        { key: 'secondary_address', label: 'Address', required: false, type: 'string' },
      ],
    };
    const result = mapFormPairs([pair('Address', '100 Main')], schema);
    const byKey = Object.fromEntries(result.fields.map((f) => [f.key, f]));
    expect(byKey.primary_address.value).toBe('100 Main');
    expect(byKey.secondary_address.missing).toBe(true);
    expect(byKey.secondary_address.flagged).toBe(false);
  });
});
