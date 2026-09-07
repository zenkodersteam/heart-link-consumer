import type {
  ListPaymentsQuery,
  ListPaymentsResponse,
  PaymentCounts,
} from '@heartlink/api-contract';

export interface PaymentsPageState {
  paymentsResponse: ListPaymentsResponse;
  counts: PaymentCounts;
  loadError: boolean;
}

export type PaymentCountFilters = Pick<
  ListPaymentsQuery,
  'method' | 'dateFrom' | 'dateTo' | 'q'
>;

const EMPTY_COUNTS: PaymentCounts = {
  all: 0,
  received: 0,
  unmatched: 0,
  matched: 0,
  confirmed: 0,
  exception: 0,
  refunded: 0,
};

/**
 * The filters that describe *which* payments, with the ones that describe which
 * slice of them stripped out — status and paging belong to a single tab, not to
 * a count across all of them.
 *
 * Takes the whole query rather than a narrowed pick: dropping fields is the
 * point, so the parameter has to be able to carry them. The narrowed type meant
 * no real caller's query fit without being trimmed first, which is the work
 * this function exists to do.
 */
export function buildPaymentCountsQuery(query: ListPaymentsQuery): PaymentCountFilters {
  return {
    method: query.method,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    q: query.q,
  };
}

export function resolvePaymentsPageState(
  paymentsResult: PromiseSettledResult<ListPaymentsResponse>,
  countsResult: PromiseSettledResult<PaymentCounts>,
  fallback: { limit: number; offset: number },
): PaymentsPageState {
  const paymentsFailed = paymentsResult.status === 'rejected';

  return {
    paymentsResponse:
      paymentsResult.status === 'fulfilled'
        ? paymentsResult.value
        : { items: [], total: 0, limit: fallback.limit, offset: fallback.offset },
    counts:
      paymentsFailed || countsResult.status === 'rejected'
        ? EMPTY_COUNTS
        : countsResult.value,
    loadError: paymentsFailed || countsResult.status === 'rejected',
  };
}