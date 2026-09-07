import Link from 'next/link';
import { Database } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/card';
import type { DashboardMetrics } from '@heartlink/api-contract';

/**
 * Dashboard "Membership metrics" card: active profiles per facility state,
 * rolling 30-day pipeline, and active-subscription plan mix. Server-rendered
 * from GET /admin/dashboard/metrics; every figure links to its filtered list.
 */

// Known listing plans get brand colors; anything else cycles the fallbacks.
const PLAN_COLORS: Record<string, string> = {
  Basic: 'var(--color-primary)',
  Diamond: 'var(--color-accent-gold)',
  VIP: 'var(--color-sidebar)',
};
const FALLBACK_COLORS = [
  'var(--color-primary)',
  'var(--color-accent-gold)',
  'var(--color-sidebar)',
  'var(--color-text-subtle)',
];
const MAX_STATES = 6;

export function MembershipMetrics({ metrics }: { metrics: DashboardMetrics | null }) {
  return (
    <Card className="animate-fade-up" style={{ animationDelay: '360ms' }}>
      <CardHeader>
        <CardTitle>Membership Metrics</CardTitle>
      </CardHeader>
      <CardBody>
        {metrics === null ? (
          <div className="px-5 py-3 text-sm text-text-muted">
            Unable to load metrics right now.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
              <StatesColumn states={metrics.profilesByState} />
              <PipelineColumn pipeline={metrics.pipeline} />
              <PlanMixColumn planMix={metrics.planMix} />
            </div>
            <div className="flex items-center gap-2 border-t border-border bg-surface-muted px-5 py-2.5 text-xs text-text-muted">
              <Database className="size-3.5 shrink-0 text-accent-gold" />
              <span>
                Live counts from profiles, facilities, payments, and subscriptions.
                Figures link through to their filtered lists.
              </span>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function ColumnCap({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-gold">
      {children}
    </div>
  );
}

function StatesColumn({ states }: { states: DashboardMetrics['profilesByState'] }) {
  const top = states.slice(0, MAX_STATES);
  const max = top[0]?.count ?? 0;
  return (
    <div className="px-5 py-4">
      <ColumnCap>Active profiles by state</ColumnCap>
      {top.length === 0 ? (
        <p className="text-sm text-text-muted">No active profiles yet.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {top.map((row, i) => (
            <li key={row.state}>
              <Link
                href="/profiles?status=active"
                className="group grid grid-cols-[36px_minmax(0,1fr)_84px] items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span className="text-xs font-bold text-text">{row.state}</span>
                <span className="h-2 overflow-hidden rounded-full bg-surface">
                  <span
                    className="animate-bar-grow block h-full rounded-full bg-gradient-to-r from-primary-hover to-primary transition-opacity group-hover:opacity-80"
                    style={{
                      width: `${max ? Math.max(6, Math.round((row.count / max) * 100)) : 0}%`,
                      animationDelay: `${i * 60}ms`,
                    }}
                  />
                </span>
                <span className="text-right text-xs text-text-muted">
                  <b className="font-bold text-text">{row.count}</b>{' '}
                  {row.count === 1 ? 'profile' : 'profiles'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PipelineColumn({ pipeline }: { pipeline: DashboardMetrics['pipeline'] }) {
  const rows: { label: string; value: number; href: string }[] = [
    { label: 'Applications received', value: pipeline.applicationsReceived, href: '/intake' },
    { label: 'Profiles activated', value: pipeline.profilesActivated, href: '/profiles?status=active' },
    { label: 'Payments matched', value: pipeline.paymentsMatched, href: '/payments?tab=matched' },
    { label: 'Photos moderated', value: pipeline.photosModerated, href: '/profiles/photo-review' },
  ];
  return (
    <div className="px-5 py-4">
      <ColumnCap>Pipeline, last 30 days</ColumnCap>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.label}>
            <Link
              href={row.href}
              className="flex items-center justify-between py-2 text-[13px] transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span className="text-text-muted">{row.label}</span>
              <span className="font-bold tabular-nums text-text">{row.value}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlanMixColumn({ planMix }: { planMix: DashboardMetrics['planMix'] }) {
  const total = planMix.totalActive;
  // Donut segments: each plan's share of the 100-unit circumference, offset
  // by the prefix sum of earlier shares (starting at 12 o'clock = 25).
  const shares = planMix.plans.map((plan) =>
    total > 0 ? (plan.count / total) * 100 : 0,
  );
  const segments = planMix.plans.map((plan, i) => ({
    ...plan,
    share: shares[i],
    offset: 25 - shares.slice(0, i).reduce((a, b) => a + b, 0),
    color: PLAN_COLORS[plan.name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }));
  return (
    <div className="px-5 py-4">
      <ColumnCap>Plans and subscribers</ColumnCap>
      <div className="flex items-center gap-4">
        <svg width="92" height="92" viewBox="0 0 42 42" role="img" aria-label={`${total} active subscriptions`}>
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--color-surface)" strokeWidth="6" />
          {total > 0
            ? segments
                .filter((s) => s.share > 0)
                .map((s) => (
                  <circle
                    key={s.name}
                    className="animate-donut-sweep"
                    cx="21"
                    cy="21"
                    r="15.9"
                    fill="none"
                    stroke={s.color}
                    strokeWidth="6"
                    strokeDasharray={`${s.share} ${100 - s.share}`}
                    strokeDashoffset={s.offset}
                    strokeLinecap={s.share < 100 ? 'round' : 'butt'}
                  />
                ))
            : null}
          <text x="21" y="20.5" textAnchor="middle" className="fill-text font-serif" fontSize="8">
            {total}
          </text>
          <text x="21" y="27" textAnchor="middle" className="fill-text-muted" fontSize="3.2" letterSpacing="0.08em">
            ACTIVE
          </text>
        </svg>
        <ul className="flex-1 text-xs text-text-muted">
          {segments.length === 0 ? (
            <li className="py-1">No active subscriptions yet.</li>
          ) : null}
          {segments.map((s) => (
            <li key={s.name} className="flex items-center gap-2 py-1">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: s.color }}
              />
              <span className="truncate">{s.name}</span>
              <b className="ml-auto font-bold text-text">{s.count}</b>
            </li>
          ))}
          <li className="flex items-center gap-2 border-t border-border py-1 pt-1.5">
            <span aria-hidden className="size-2.5 shrink-0 rounded-[3px] bg-surface" />
            <span>Payment pending</span>
            <b className="ml-auto font-bold text-text">{planMix.paymentPending}</b>
          </li>
        </ul>
      </div>
    </div>
  );
}
