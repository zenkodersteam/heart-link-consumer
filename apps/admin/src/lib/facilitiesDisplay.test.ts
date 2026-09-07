import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFacilitiesOverview,
  formatFacilityAddress,
  formatFacilityLocation,
  getFacilityStatusLabel,
} from './facilitiesDisplay.ts';

test('formatFacilityLocation combines city and state cleanly', () => {
  assert.equal(formatFacilityLocation({ city: 'Houston', state: 'TX' }), 'Houston, TX');
  assert.equal(formatFacilityLocation({ city: 'Houston', state: '' }), 'Houston');
  assert.equal(formatFacilityLocation({ city: '', state: 'TX' }), 'TX');
  assert.equal(formatFacilityLocation({ city: '', state: '' }), '-');
});

test('formatFacilityAddress builds a mailing line without blank segments', () => {
  assert.equal(
    formatFacilityAddress({
      addressLine1: '123 Main St',
      addressLine2: 'Unit B',
      city: 'Houston',
      state: 'TX',
      zip: '77001',
    }),
    '123 Main St, Unit B, Houston, TX 77001',
  );
  assert.equal(
    formatFacilityAddress({
      addressLine1: '123 Main St',
      addressLine2: null,
      city: 'Houston',
      state: 'TX',
      zip: '77001',
    }),
    '123 Main St, Houston, TX 77001',
  );
});

test('buildFacilitiesOverview counts active, inactive, and internal test facilities', () => {
  assert.deepEqual(
    // Only the name and status are read; the address fields were decoration
    // that the narrowed parameter type rejects.
    buildFacilitiesOverview([
      { name: 'W7 Demo Facility A', status: 'active' },
      { name: 'Harris County Jail', status: 'active' },
      { name: 'QA Validation Facility', status: 'inactive' },
    ]),
    { total: 3, active: 2, inactive: 1, internal: 2 },
  );
});

test('getFacilityStatusLabel humanizes facility statuses', () => {
  assert.equal(getFacilityStatusLabel('active'), 'Active');
  assert.equal(getFacilityStatusLabel('inactive'), 'Inactive');
});
