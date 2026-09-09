import test from 'node:test';
import assert from 'node:assert/strict';
import type { NavCounts } from '@heartlink/api-contract';
import { APPLICATION_STATUS_LABEL, PROFILE_STATUS_LABEL } from './adminLabels.ts';
import {
  formatFacilityLabel,
  formatFacilityNotes,
  isNonProductionFacilityName,
} from './adminDisplay.ts';
import { buildPaymentCountsQuery } from './paymentsPageState.ts';
import { resolvePaymentsPageState } from './paymentsPageState.ts';
import { getInitialStatDisplay } from './dashboardStats.ts';
import {
  filterInboundProfiles,
  filterInboundUsers,
  profileLabel,
  userLabel,
} from './inboundMailLookup.ts';
import {
  buildCreateApplicationSuccessMessage,
  getApplicationSourceLabel,
} from './intakeCreateFlow.ts';
import { canUploadReturnedScan, getManualStatusAdvance } from './intakeProgression.ts';
import { CreateApplicationSchema } from './schemas.ts';

function applyNavCountsOverride(
  counts: NavCounts | undefined,
  override: Partial<NavCounts> | null,
): NavCounts | undefined {
  if (!counts) return undefined;
  return override ? { ...counts, ...override } : counts;
}

test('payments page state falls back safely when upstream calls fail', () => {
  const state = resolvePaymentsPageState(
    { status: 'rejected', reason: new Error('payments down') },
    { status: 'rejected', reason: new Error('counts down') },
    { limit: 25, offset: 50 },
  );

  assert.equal(state.loadError, true);
  assert.deepEqual(state.paymentsResponse, {
    items: [],
    total: 0,
    limit: 25,
    offset: 50,
  });
  assert.deepEqual(state.counts, {
    all: 0,
    received: 0,
    unmatched: 0,
    matched: 0,
    confirmed: 0,
    exception: 0,
    refunded: 0,
  });
});

test('payments page state hides counts when rows fail to load', () => {
  const state = resolvePaymentsPageState(
    { status: 'rejected', reason: new Error('payments down') },
    {
      status: 'fulfilled',
      value: {
        all: 27,
        received: 3,
        unmatched: 8,
        matched: 5,
        confirmed: 0,
        exception: 6,
        refunded: 0,
      },
    },
    { limit: 25, offset: 0 },
  );

  assert.deepEqual(state.counts, {
    all: 0,
    received: 0,
    unmatched: 0,
    matched: 0,
    confirmed: 0,
    exception: 0,
    refunded: 0,
  });
});

test('application statuses are humanized for admin UI', () => {
  assert.equal(APPLICATION_STATUS_LABEL.packet_requested, 'Packet Requested');
  assert.equal(APPLICATION_STATUS_LABEL.waiting_for_return, 'Awaiting Return');
  assert.equal(APPLICATION_STATUS_LABEL.ocr_processed, 'Processed');
});

test('profile statuses are humanized for admin UI', () => {
  assert.equal(PROFILE_STATUS_LABEL.pending_approval, 'Pending Approval');
  assert.equal(PROFILE_STATUS_LABEL.pending_payment, 'Pending Payment');
});

test('seed and QA facility names are treated as non-production labels', () => {
  assert.equal(isNonProductionFacilityName('W7 Demo Facility A'), true);
  assert.equal(isNonProductionFacilityName('M2 Demo Correctional Facility'), true);
  assert.equal(isNonProductionFacilityName('Real Facility'), false);
  assert.equal(
    formatFacilityLabel({ name: 'W7 Demo Facility A', state: 'TX' }),
    'TX',
  );
});

test('seed and QA notes are masked for production-facing admin UI', () => {
  assert.equal(formatFacilityNotes('Seeded by seed-m3-w7-demo.ts'), 'Internal test record');
  assert.equal(
    formatFacilityNotes('Created + edited during admin QA validation'),
    'Internal test record',
  );
  assert.equal(formatFacilityNotes('Standard facility instructions'), 'Standard facility instructions');
});

test('payment counts query keeps active filters but drops status pagination fields', () => {
  assert.deepEqual(
    buildPaymentCountsQuery({
      status: ['matched'],
      method: 'manual',
      dateFrom: '2026-07-01T00:00:00.000Z',
      dateTo: '2026-07-31T23:59:59.999Z',
      q: 'Carlos',
      limit: 25,
      offset: 50,
    }),
    {
      method: 'manual',
      dateFrom: '2026-07-01T00:00:00.000Z',
      dateTo: '2026-07-31T23:59:59.999Z',
      q: 'Carlos',
    },
  );
});

test('payments nav badge can be zeroed while other nav counts remain intact', () => {
  assert.deepEqual(
    applyNavCountsOverride(
      { intake: 2, profiles: 4, payments: 17, moderation: 0, letters: 0, outboundMail: 0 },
      { payments: 0 },
    ),
    { intake: 2, profiles: 4, payments: 0, moderation: 0, letters: 0, outboundMail: 0 },
  );
});

test('dashboard stat cards initialize to the real count instead of flashing zero', () => {
  assert.equal(getInitialStatDisplay(17), 17);
  assert.equal(getInitialStatDisplay(0), 0);
  assert.equal(getInitialStatDisplay(null), null);
});

test('inbound-mail lookup labels are human-readable and include stable identifiers', () => {
  assert.equal(
    profileLabel({ id: 'profile-123', displayName: 'Marcus Bell' } as never),
    'Marcus Bell · profile-123',
  );
  assert.equal(
    userLabel({ id: 'user-456', displayName: null, email: 'outside@example.com' }),
    'outside@example.com · outside@example.com',
  );
});

test('inbound-mail profile lookup matches by name or profile id and caps results', () => {
  // No cast: the generic already accepts anything carrying an id and a display
  // name, and `as never[]` was throwing away the element type the assertions
  // below rely on.
  const profiles = [
    { id: 'profile-123', displayName: 'Marcus Bell' },
    { id: 'profile-456', displayName: 'Andre Phillips' },
  ];

  assert.deepEqual(
    filterInboundProfiles(profiles, 'marcus').map((profile) => profile.id),
    ['profile-123'],
  );
  assert.deepEqual(
    filterInboundProfiles(profiles, '456').map((profile) => profile.id),
    ['profile-456'],
  );
});

test('inbound-mail outside-user lookup matches by name, email, or user id', () => {
  const users = [
    { id: 'user-123', displayName: 'Jordan Example', email: 'jordan@example.com' },
    { id: 'user-456', displayName: null, email: 'outside@example.com' },
  ];

  assert.deepEqual(
    filterInboundUsers(users, 'jordan').map((user) => user.id),
    ['user-123'],
  );
  assert.deepEqual(
    filterInboundUsers(users, 'outside@example.com').map((user) => user.id),
    ['user-456'],
  );
  assert.deepEqual(
    filterInboundUsers(users, '456').map((user) => user.id),
    ['user-456'],
  );
});

test('create-application schema normalizes optional assigned staff id and requires supported source channel', () => {
  assert.deepEqual(
    CreateApplicationSchema.parse({
      facilityId: '11111111-1111-4111-8111-111111111111',
      sourceChannel: 'mail_request',
      assignedStaffId: '',
    }),
    {
      facilityId: '11111111-1111-4111-8111-111111111111',
      sourceChannel: 'mail_request',
      assignedStaffId: undefined,
    },
  );

  assert.throws(
    () =>
      CreateApplicationSchema.parse({
        facilityId: '11111111-1111-4111-8111-111111111111',
        sourceChannel: 'not_real',
      }),
    /Invalid option/,
  );
});

test('intake create flow labels and success copy are operator-readable', () => {
  assert.equal(getApplicationSourceLabel('mail_request'), 'Mail Request');
  assert.equal(getApplicationSourceLabel('facility_campaign'), 'Facility Campaign');
  assert.equal(
    buildCreateApplicationSuccessMessage('APP-20260720-abc123', 'mail_request'),
    'Created Mail Request application APP-20260720-abc123',
  );
});

test('manual packet-lifecycle progression is exposed only for pre-return states', () => {
  assert.deepEqual(getManualStatusAdvance('packet_requested'), {
    targetStatus: 'packet_generated',
    label: 'Generate Packet',
    successMessage: 'Application moved to Packet Generated',
  });
  assert.deepEqual(getManualStatusAdvance('waiting_for_return'), {
    targetStatus: 'returned',
    label: 'Mark Packet Returned',
    successMessage: 'Application moved to Returned',
  });
  assert.equal(getManualStatusAdvance('returned'), null);
  assert.equal(getManualStatusAdvance('needs_review'), null);
});

test('returned applications expose scan upload instead of another manual status button', () => {
  assert.equal(canUploadReturnedScan('returned'), true);
  assert.equal(canUploadReturnedScan('packet_sent'), false);
});
