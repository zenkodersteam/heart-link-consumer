import { AlertTriangle } from 'lucide-react';
import { serverApi } from '../../../lib/api';
import { PaymentsTabs } from '../../../components/payments/PaymentsTabs';
import { PaymentsFilters } from '../../../components/payments/PaymentsFilters';
import { PaymentsNavBadgeSync } from '../../../components/payments/PaymentsNavBadgeSync';
import { PaymentsTable } from '../../../components/payments/PaymentsTable';
import { Pagination } from '../../../components/intake/Pagination';
import { RecordPaymentDialog } from '../../../components/payments/RecordPaymentDialog';
import type {
  ListPaymentsQuery,
  PaymentMethod,
  PaymentStatus,
} from '@heartlink/api-contract';
import { PageHero } from '../../../components/layout/PageHero';
import {
  buildPaymentCountsQuery,
  resolvePaymentsPageState,
} from '../../../lib/paymentsPageState';
import { formatShortDate } from '../../../lib/utils';
import { MarkSectionSeen } from '../../../components/shell/MarkSectionSeen';

export const dynamic = 'force-dynamic';

// "Unmatched" is the needs-attention bucket: freshly recorded (received) plus
// reviewed-but-unmatched. This mirrors the PaymentsTabs badge count so the tab
// number and the list never disagree. All/other tabs map to a single status.
const TAB_TO_STATUSES: Record<string, PaymentStatus[] | undefined> = {
  unmatched: ['received', 'unmatched'],
  matched: ['matched'],
  confirmed: ['confirmed'],
  exception: ['exception'],
};

export default async function PaymentsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tab = (sp.tab as string | undefined) ?? 'all';

  const range = (sp.range as string | undefined) ?? 'last_30_days';
  const { dateFrom, dateTo } = computeRange(range);

  const query: ListPaymentsQuery = {
    status: TAB_TO_STATUSES[tab],
    method: (sp.method as PaymentMethod | undefined) || undefined,
    dateFrom,
    dateTo,
    q: (sp.q as string | undefined) || undefined,
    limit: parseIntOr(sp.limit, 25),
    offset: parseIntOr(sp.offset, 0),
  };

  const api = await serverApi();
  const [paymentsResult, countsResult, invitesResult] = await Promise.allSettled([
    api.listPayments(query),
    api.getPaymentCounts(buildPaymentCountsQuery(query)),
    api.listSponsorInvites(),
  ]);
  // A failed fetch is not the same as "no invites". Falling back to an empty
  // array rendered "0 outstanding · 0 converted" and an encouraging empty
  // state, which is indistinguishable from a working panel with nothing in it —
  // so an outage looked like good news.
  const sponsorInvites =
    invitesResult.status === 'fulfilled' ? invitesResult.value.items : [];
  const sponsorInvitesFailed = invitesResult.status === 'rejected';

  const { paymentsResponse, counts, loadError } = resolvePaymentsPageState(
    paymentsResult,
    countsResult,
    { limit: query.limit ?? 25, offset: query.offset ?? 0 },
  );

  // Resolve "Matched To" labels - one detail call per row. Cheap for first page;
  // backend can return the join in list view later if perf bites.
  const matchedLabelsEntries = await Promise.all(
    paymentsResponse.items.map(async (row) => {
      if (!row.applicationId && !row.profileId) return [row.id, '-'] as const;
      try {
        const detail = await api.getPayment(row.id);
        const m = detail.matched;
        if (!m) return [row.id, '-'] as const;
        const name = m.profileDisplayName ?? '';
        const num = m.applicationNumber ?? '';
        return [row.id, [name, num].filter(Boolean).join(' ')] as const;
      } catch {
        return [row.id, '-'] as const;
      }
    }),
  );
  const matchedLabels = Object.fromEntries(matchedLabelsEntries) as Record<string, string>;

  return (
    <div className="flex w-full flex-col gap-5 p-8">
      <MarkSectionSeen section="payments" />
      <PaymentsNavBadgeSync hideBadge={loadError} />
      <PageHero
        eyebrow="Payments"
        title="Payments"
        description="Track confirmations and exceptions inside a softer, trust-forward shell that still makes financial follow-up feel operationally crisp."
        actions={<RecordPaymentDialog />}
      />

      <PaymentsTabs counts={counts} />
      <PaymentsFilters />

      {loadError ? (
        <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-muted shadow-soft">
          Some payment data could not be loaded right now. The page is still available, but totals or rows may be incomplete until the upstream service recovers.
        </div>
      ) : null}

      <PaymentsTable items={paymentsResponse.items} matchedLabels={matchedLabels} />

      <Pagination
        total={paymentsResponse.total}
        limit={paymentsResponse.limit}
        offset={paymentsResponse.offset}
      />

      {/* Payer invite loop: who was invited to pay online, and who converted. */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="text-lg font-semibold text-text">Sponsor invites</h2>
        {sponsorInvitesFailed ? null : (
          <span className="inline-flex items-center rounded-pill-lg bg-surface-muted px-3 py-1.5 text-xs font-medium text-text-muted">
            {sponsorInvites.filter((i) => i.status === 'sent').length} outstanding ·{' '}
            {sponsorInvites.filter((i) => i.status === 'converted').length} converted
          </span>
        )}
      </div>
      {sponsorInvitesFailed ? (
        <div className="flex w-full items-start gap-3 rounded-lg border border-danger/30 bg-danger-tint px-4 py-3 text-sm text-text">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
          <span>
            Sponsor invites could not be loaded, so the counts above are not being shown rather
            than shown as zero. Reload to try again.
          </span>
        </div>
      ) : sponsorInvites.length === 0 ? (
        <div className="hl-empty-state flex w-full items-center justify-center px-6 py-10 text-sm">
          No sponsor invites yet. They send automatically when a verified application names an
          outside payer with an email address.
        </div>
      ) : (
        <div className="hl-table-shell">
          <div className="hl-table-head flex items-center px-4 py-3 text-[13px] font-medium leading-[18px]">
            <div className="flex-[1.2] min-w-0">Member</div>
            <div className="flex-[1.2] min-w-0">Payer</div>
            <div className="flex-[1.4] min-w-0">Payer email</div>
            <div className="w-[110px]">Status</div>
            <div className="w-[110px]">Invited</div>
            <div className="w-[110px]">Converted</div>
          </div>
          {sponsorInvites.map((invite, idx) => (
            <div
              key={invite.id}
              className={`flex items-center border-b border-border px-4 py-3.5 text-sm leading-5 text-text ${idx % 2 === 1 ? 'bg-surface-muted' : 'bg-background'}`}
            >
              <div className="flex-[1.2] min-w-0 truncate font-medium">
                {invite.profileDisplayName || 'Unknown member'}
              </div>
              <div className="flex-[1.2] min-w-0 truncate">{invite.payerName || '-'}</div>
              <div className="flex-[1.4] min-w-0 truncate text-text-muted">{invite.payerEmail}</div>
              <div className="w-[110px]">
                <span
                  className={`inline-flex items-center rounded-pill-lg px-2.5 py-1 text-xs font-medium ${
                    invite.status === 'converted'
                      ? 'bg-success-tint text-success'
                      : 'bg-warning-tint text-warning'
                  }`}
                >
                  {invite.status === 'converted' ? 'Converted' : 'Outstanding'}
                </span>
              </div>
              <div className="w-[110px]">{formatShortDate(invite.createdAt)}</div>
              <div className="w-[110px]">
                {invite.convertedAt ? formatShortDate(invite.convertedAt) : '-'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function computeRange(label: string): { dateFrom?: string; dateTo?: string } {
  if (label === 'all') return {};
  const now = new Date();
  const days = label === 'last_7_days' ? 7 : label === 'last_90_days' ? 90 : 30;
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { dateFrom: from.toISOString() };
}

function parseIntOr(value: string | string[] | undefined, fallback: number): number {
  if (Array.isArray(value)) value = value[0];
  const n = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}
