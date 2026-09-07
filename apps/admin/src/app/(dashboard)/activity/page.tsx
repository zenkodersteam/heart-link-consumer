import Link from 'next/link';
import { Download } from 'lucide-react';
import type { ListActivityQuery } from '@heartlink/api-contract';
import { serverApi } from '../../../lib/api';
import { ActivityFilters } from '../../../components/activity/ActivityFilters';
import { Pagination } from '../../../components/intake/Pagination';

export const dynamic = 'force-dynamic';

function num(v: unknown, fallback: number): number {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * The full audit trail.
 *
 * Everything shown here was already being recorded; the only view over it
 * returned the twenty most recent, capped at fifty. Anything older was
 * unreachable — which is when an audit log actually matters, since nobody looks
 * one up until weeks later.
 */
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const query: ListActivityQuery = {
    action: (sp.action as string | undefined) || undefined,
    entityType: (sp.entityType as string | undefined) || undefined,
    q: (sp.q as string | undefined) || undefined,
    dateFrom: (sp.dateFrom as string | undefined) || undefined,
    dateTo: (sp.dateTo as string | undefined) || undefined,
    limit: num(sp.limit, 50),
    offset: num(sp.offset, 0),
  };

  const api = await serverApi();
  const activity = await api.listActivity(query);

  // The export carries the same filters, so what downloads is what is on screen
  // rather than an unrelated dump of everything.
  const exportQuery = new URLSearchParams(
    Object.entries(query).flatMap(([k, v]) =>
      v && k !== 'limit' && k !== 'offset' ? [[k, String(v)]] : [],
    ) as [string, string][],
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
        <h1 className="font-serif text-2xl leading-[34px] text-text">Activity</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">
            {activity.total.toLocaleString()} recorded
          </span>
          <Link
            href={`/api/activity-export?${exportQuery.toString()}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[13px] font-medium text-text hover:bg-surface"
          >
            <Download className="size-3.5" /> Export
          </Link>
        </div>
      </header>

      <ActivityFilters actions={activity.actions} />

      {activity.items.length === 0 ? (
        <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-text-muted">
          Nothing matches those filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-surface-muted text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">What happened</th>
                <th className="px-4 py-3 font-medium">Who</th>
                <th className="px-4 py-3 font-medium">On</th>
              </tr>
            </thead>
            <tbody>
              {activity.items.map((e) => (
                <tr key={e.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-text">{e.label}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {e.actorName ?? (e.actorType === 'user' ? 'Unknown staff member' : e.actorType)}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{e.entityType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        total={activity.total}
        limit={activity.limit}
        offset={activity.offset}
      />
    </div>
  );
}
