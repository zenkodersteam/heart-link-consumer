const NON_PRODUCTION_FACILITY_NAME_PATTERNS = [
  /^W7 Demo Facility\b/i,
  /^M2 Demo Correctional Facility$/i,
  /^QA Validation Facility$/i,
];

const NON_PRODUCTION_NOTE_PATTERNS = [
  /seeded by seed-/i,
  /seed facility for development/i,
  /admin qa validation/i,
  /created \+ edited during admin qa validation/i,
];

export function isNonProductionFacilityName(name: string | null | undefined): boolean {
  if (!name) return false;
  return NON_PRODUCTION_FACILITY_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

export function formatFacilityLabel(facility: {
  name?: string | null;
  state?: string | null;
} | null | undefined): string {
  if (!facility) return '-';
  if (isNonProductionFacilityName(facility.name)) {
    return facility.state?.trim() || 'Internal test facility';
  }
  return facility.name?.trim() || facility.state?.trim() || '-';
}

export function formatFacilityNotes(notes: string | null | undefined): string {
  if (!notes) return '-';
  if (NON_PRODUCTION_NOTE_PATTERNS.some((pattern) => pattern.test(notes))) {
    return 'Internal test record';
  }
  return notes;
}