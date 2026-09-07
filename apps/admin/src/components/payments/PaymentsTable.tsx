import Link from 'next/link';
import type { Payment } from '@heartlink/api-contract';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { formatShortDate } from '../../lib/utils';

const METHOD_LABEL: Record<Payment['method'], string> = {
  mail_check: 'Check',
  mail_money_order: 'Money Order',
  stripe: 'Stripe',
  paypal: 'PayPal',
  manual: 'Manual',
};

export function PaymentsTable({
  items,
  matchedLabels,
}: {
  items: Payment[];
  matchedLabels: Record<string, string>;
}) {
  if (items.length === 0) {
    return (
      <div className="hl-empty-state flex w-full items-center justify-center px-6 py-16 text-sm">
        No payments match the current filters.
      </div>
    );
  }
  return (
    <div className="hl-table-shell w-full">
      <div className="hl-table-head flex items-center px-4 py-3 text-[13px] font-medium leading-[18px]">
        <div className="w-[110px]">Payment ID</div>
        <div className="w-[100px]">Amount</div>
        <div className="flex-1 min-w-0">Method</div>
        <div className="flex-[1.4] min-w-0">Payer Name</div>
        <div className="w-[110px]">Status</div>
        <div className="flex-[1.4] min-w-0">Matched To</div>
        <div className="w-[100px]">Received</div>
        <div className="w-[100px]">Matched</div>
      </div>
      {items.map((row, idx) => {
        const zebra = idx % 2 === 1;
        const isUnmatched = row.status === 'unmatched' || row.status === 'received';
        const matchedLabel = matchedLabels[row.id] ?? '-';
        const isMatched = row.status === 'matched';
        return (
          <div
            key={row.id}
            className={`flex items-center border-b border-border px-4 py-3.5 text-sm leading-5 text-text transition-colors hover:bg-surface ${
              zebra ? 'bg-surface-muted' : 'bg-background'
            }`}
          >
            <div className="w-[110px] truncate">{row.paymentNumber}</div>
            <div className="w-[100px] tabular-nums">
              ${(row.amountCents / 100).toFixed(2)}
            </div>
            <div className="flex-1 min-w-0 truncate">{METHOD_LABEL[row.method]}</div>
            <div className="flex-[1.4] min-w-0 truncate">{row.payerName}</div>
            <div className="w-[110px]">
              <PaymentStatusBadge status={row.status} />
            </div>
            <div className="flex-[1.4] min-w-0 truncate">
              {isUnmatched ? (
                <Link
                  href={`/payments/${row.id}/match`}
                  className="text-primary hover:underline"
                >
                  Match…
                </Link>
              ) : isMatched ? (
                <Link
                  href={`/payments/${row.id}/match`}
                  className="text-primary hover:underline"
                >
                  {matchedLabel}
                </Link>
              ) : (
                matchedLabel
              )}
            </div>
            <div className="w-[100px]">{formatShortDate(row.receivedDate)}</div>
            <div className="w-[100px]">{formatShortDate(row.matchedAt)}</div>
          </div>
        );
      })}
    </div>
  );
}
