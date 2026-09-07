import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { serverApi } from '../../../../../lib/api';
import { PaymentSummaryCard } from '../../../../../components/payments/PaymentSummaryCard';
import { MatchSearchPanel } from '../../../../../components/payments/MatchSearchPanel';
import { PaymentConfirmPanel } from '../../../../../components/payments/PaymentConfirmPanel';
import { MatchFlowSteps } from '../../../../../components/payments/MatchFlowSteps';

export const dynamic = 'force-dynamic';

export default async function MatchPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const initialQ = ((sp.q as string | undefined) ?? '').trim();

  const api = await serverApi();
  const [payment, suggestions] = await Promise.all([
    api.getPayment(id),
    api.listMatchSuggestions(id, initialQ || undefined),
  ]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link
          href="/payments"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to Payments
        </Link>
        <span className="text-text-muted">|</span>
        <h1 className="font-serif text-2xl leading-[34px] text-text">
          Match Payment #{payment.paymentNumber}
        </h1>
      </header>

      {/* What this screen is for, before the detail of it. Matching then
          confirming is two steps, and the second one only appeared once the
          first was done — so there was nothing to tell you it existed. */}
      <MatchFlowSteps payment={payment} />

      <PaymentSummaryCard payment={payment} />

      {/* Confirm sits above the search once a match exists: at that point it is
          the next thing to do, and leaving it underneath meant scrolling past
          the search results to reach it. */}
      {payment.status === 'matched' && <PaymentConfirmPanel payment={payment} />}

      {payment.status !== 'confirmed' && (
        <MatchSearchPanel
          paymentId={id}
          initialSuggestions={suggestions.items}
          initialQuery={initialQ}
        />
      )}
    </div>
  );
}
