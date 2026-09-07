import type { ApplicationSourceChannel } from '@heartlink/api-contract';

const APPLICATION_SOURCE_LABEL: Record<ApplicationSourceChannel, string> = {
  outreach: 'Outreach',
  mail_request: 'Mail Request',
  referral: 'Referral',
  facility_campaign: 'Facility Campaign',
  staff_created: 'Staff Created',
};

export function getApplicationSourceLabel(source: ApplicationSourceChannel): string {
  return APPLICATION_SOURCE_LABEL[source];
}

export function buildCreateApplicationSuccessMessage(
  applicationNumber: string,
  source: ApplicationSourceChannel,
): string {
  return `Created ${getApplicationSourceLabel(source)} application ${applicationNumber}`;
}

export const APPLICATION_SOURCE_OPTIONS = (
  Object.entries(APPLICATION_SOURCE_LABEL) as Array<[ApplicationSourceChannel, string]>
).map(([value, label]) => ({ value, label }));
