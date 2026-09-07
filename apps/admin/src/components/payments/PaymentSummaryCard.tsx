import type { ReactNode } from 'react';
import type { PaymentDetail } from '@heartlink/api-contract';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { formatShortDate } from '../../lib/utils';

const METHOD_LABEL: Record<PaymentDetail['method'], string> = {
  mail_check: 'Check',
  mail_money_order: 'Money Order',
  stripe: 'Stripe',
  paypal: 'PayPal',
  manual: 'Manual',
};

const PURPOSE_LABEL: Record<NonNullable<PaymentDetail['purpose']>, string> = {
  listing: 'Listing activation',
  consumer: 'Consumer purchase',
  other: 'Other',
};

export function PaymentSummaryCard({ payment }: { payment: PaymentDetail }) {
  return (
    <section className="rounded-lg border border-border bg-background p-5">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4 xl:grid-cols-8">
        <SummaryField label="Amount" value={`$${(payment.amountCents / 100).toFixed(2)}`} />
        <SummaryField label="Method" value={METHOD_LABEL[payment.method]} />
        <SummaryField label="Payer" value={payment.payerName} />
        <SummaryField label="Received" value={formatShortDate(payment.receivedDate)} />
        <SummaryField label="Status" value={<PaymentStatusBadge status={payment.status} />} />
        <SummaryField
          label="Purpose"
          value={payment.purpose ? PURPOSE_LABEL[payment.purpose] : 'Legacy / inferred'}
        />
        <SummaryField
          label="Confirmed"
          value={payment.confirmedAt ? formatShortDate(payment.confirmedAt) : 'Not yet'}
        />
        <SummaryField label="Notes" value={payment.notes ?? '-'} />
      </div>
    </section>
  );
}

function SummaryField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <div className="hl-section-label">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-text">{value}</div>
    </div>
  );
}
