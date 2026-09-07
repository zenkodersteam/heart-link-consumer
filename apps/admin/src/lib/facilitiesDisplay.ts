import type { Facility, FacilityStatus } from '@heartlink/api-contract';

const NON_PRODUCTION_FACILITY_NAME_PATTERNS = [
  /^W7 Demo Facility\b/i,
  /^M2 Demo Correctional Facility$/i,
  /^QA Validation Facility$/i,
];

export function formatFacilityLocation(facility: {
  city?: string | null;
  state?: string | null;
}): string {
  const city = facility.city?.trim() ?? '';
  const state = facility.state?.trim() ?? '';
  if (city && state) return `${city}, ${state}`;
  return city || state || '-';
}

export function formatFacilityAddress(facility: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string {
  const parts = [facility.addressLine1?.trim(), facility.addressLine2?.trim()].filter(Boolean);
  const city = facility.city?.trim() ?? '';
  const state = facility.state?.trim() ?? '';
  const zip = facility.zip?.trim() ?? '';
  const location = [city ? [city, state].filter(Boolean).join(', ') : state, zip]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (location) parts.push(location);
  return parts.join(', ') || '-';
}

export function buildFacilitiesOverview(
  facilities: Array<Pick<Facility, 'name' | 'status'>>,
): { total: number; active: number; inactive: number; internal: number } {
  return facilities.reduce(
    (summary, facility) => {
      summary.total += 1;
      if (facility.status === 'active') summary.active += 1;
      if (facility.status === 'inactive') summary.inactive += 1;
      if (isNonProductionFacilityName(facility.name)) summary.internal += 1;
      return summary;
    },
    { total: 0, active: 0, inactive: 0, internal: 0 },
  );
}

export function getFacilityStatusLabel(status: FacilityStatus): string {
  return status === 'active' ? 'Active' : 'Inactive';
}

function isNonProductionFacilityName(name: string | null | undefined): boolean {
  if (!name) return false;
  return NON_PRODUCTION_FACILITY_NAME_PATTERNS.some((pattern) => pattern.test(name));
}
