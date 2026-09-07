import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Inbox,
  Shield,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '../../../components/ui/card';
import { StatCard, type StatIcon, type StatTone } from '../../../components/dashboard/StatCard';
import { MembershipMetrics } from '../../../components/dashboard/MembershipMetrics';
import {
  buildAttentionItems,
  describeSignal,
  summarizeAttention,
  type AttentionItem,
  type AttentionKind,
  type AttentionSeverity,
} from '../../../lib/dashboardAttention';
import { cn, formatRelative } from '../../../lib/utils';
import { currentStaff, serverApi } from '../../../lib/api';
import type {
  DashboardMetrics,
  NavCounts,
  RecentActivityEntry,
  RecentActivityResponse,
} from '@heartlink/api-contract';

/**
 * Admin Dashboard - landing surface for ops staff. Greeting hero + stat tiles
 * from the nav-counts aggregate, task-style "Needs Attention" rows with inline
 * CTAs (Remote pattern), Recent Activity from the audit log, and the
 * Membership Metrics card (profiles by state, 30-day pipeline, plan mix).
 */

export const dynamic = 'force-dynamic';

const ACTIVITY_DOT: Record<string, string> = {
  profile: 'bg-primary',
  profile_photo: 'bg-primary',
  payment: 'bg-accent-gold',
  application: 'bg-accent-gold',
  document: 'bg-text-subtle',
  other: 'bg-text-subtle',
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const ATTENTION_ICON: Record<AttentionKind, LucideIcon> = {
  signal: AlertTriangle,
  safety: Shield,
  payment: CreditCard,
  verification: Inbox,
  activation: Users,
  clear: CheckCircle2,
};

const ATTENTION_STYLE: Record<
  AttentionSeverity,
  { row: string; icon: string; label: string; cta: string }
> = {
  unknown: {
    row: 'border-danger/25 bg-danger/[0.035]',
    icon: 'bg-danger/12 text-danger',
    label: 'bg-danger-tint text-danger',
    cta: 'border-danger/30 text-danger hover:border-danger/55 hover:bg-danger/[0.04]',
  },
  critical: {
    row: 'border-danger/25 bg-danger/[0.035]',
    icon: 'bg-danger/12 text-danger',
    label: 'bg-danger-tint text-danger',
    cta: 'border-danger/30 text-danger hover:border-danger/55 hover:bg-danger/[0.04]',
  },
  elevated: {
    row: 'border-warning/25 bg-warning/[0.04]',
    icon: 'bg-warning/12 text-warning',
    label: 'bg-warning-tint text-warning',
    cta: 'border-warning/35 text-text hover:border-warning/60 hover:bg-warning/[0.05]',
  },
  steady: {
    row: 'border-border bg-background',
    icon: 'bg-primary/10 text-primary',
    label: 'bg-primary/10 text-primary',
    cta: 'border-border text-text hover:border-primary/35 hover:bg-primary/[0.035]',
  },
  clear: {
    row: 'border-success/25 bg-success/[0.035]',
    icon: 'bg-success/10 text-success',
    label: 'bg-success-tint text-success',
    cta: 'border-success/30 text-success hover:border-success/55 hover:bg-success/[0.04]',
  },
};

export default async function DashboardPage() {
  let counts: NavCounts | null = null;
  let activity: RecentActivityResponse | null = null;
  let metrics: DashboardMetrics | null = null;
  const api = await serverApi();
  const [countsResult, activityResult, metricsResult, user] =
    await Promise.allSettled([
      api.getNavCounts(),
      api.getRecentActivity(10),
      api.getDashboardMetrics(),
      currentStaff(),
    ]);
  if (countsResult.status === 'fulfilled') counts = countsResult.value;
  if (activityResult.status === 'fulfilled') activity = activityResult.value;
  if (metricsResult.status === 'fulfilled') metrics = metricsResult.value;
  // There is no separate first name any more: an account is an email address
  // and whatever display name staff chose, so the greeting takes the first word
  // of that and falls back to the part before the @.
  const staff = user.status === 'fulfilled' ? user.value : null;
  const firstName =
    staff?.displayName?.trim().split(/\s+/)[0] ?? staff?.email?.split('@')[0] ?? null;

  const attentionItems = buildAttentionItems(counts);
  const attentionSummary = summarizeAttention(attentionItems);

  const stats: {
    value: number | null;
    label: string;
    caption: string;
    tone: StatTone;
    href: string;
    icon: StatIcon;
  }[] = [
    {
      value: counts ? counts.intake : null,
      label: 'Intake review',
      ...describeSignal('intake', counts ? counts.intake : null),
      href: '/intake/review',
      icon: 'inbox',
    },
    {
      value: counts ? counts.profiles : null,
      label: 'Profile activation',
      ...describeSignal('profiles', counts ? counts.profiles : null),
      href: '/profiles',
      icon: 'users',
    },
    {
      value: counts ? counts.payments : null,
      label: 'Payment matching',
      ...describeSignal('payments', counts ? counts.payments : null),
      href: '/payments?tab=unmatched',
      icon: 'credit-card',
    },
    {
      value: counts ? counts.moderation : null,
      label: 'Safety review',
      ...describeSignal('moderation', counts ? counts.moderation : null),
      href: '/moderation',
      icon: 'shield',
    },
  ];

  return (
    <div className="flex w-full flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-6 lg:p-8">
      {/* Greeting hero */}
      <div className="animate-fade-up rounded-xl border border-border bg-background/65 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-gold">
          Operations command center
        </p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="font-serif text-[30px] leading-[1.12] text-text sm:text-[36px]">
              {greeting()}
              {firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
              {attentionSummary.headline}
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <span
              className={cn(
                'inline-flex flex-1 items-center justify-center rounded-pill border px-3 py-2 text-xs font-semibold sm:flex-none',
                attentionSummary.severity === 'critical'
                  ? 'border-danger/25 bg-danger-tint text-danger'
                  : attentionSummary.severity === 'unknown'
                    ? 'border-danger/25 bg-danger/[0.08] text-danger'
                    : attentionSummary.severity === 'clear'
                      ? 'border-success/25 bg-success-tint text-success'
                      : 'border-warning/25 bg-warning-tint text-warning',
              )}
            >
              {attentionSummary.criticalCount > 0
                ? `${attentionSummary.criticalCount} blocking`
                : attentionSummary.severity === 'clear'
                  ? 'Clear'
                  : attentionSummary.severity === 'unknown'
                    ? 'Unverified'
                    : `${attentionSummary.openCount} active`}
            </span>
            <Link
              href="/intake"
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-pill border border-border bg-background px-3 py-2 text-xs font-semibold text-text transition-all hover:border-border-strong hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:flex-none"
            >
              Open queues
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stat cards - live nav-counts aggregate */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {stats.map((stat, i) => (
          <StatCard
            key={stat.label}
            value={stat.value}
            label={stat.label}
            caption={stat.caption}
            tone={stat.tone}
            href={stat.href}
            icon={stat.icon}
            index={i}
          />
        ))}
      </div>

      {/* Two-column: command board + Recent Activity */}
      <div
        className="grid animate-fade-up grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] xl:gap-6"
        style={{ animationDelay: '240ms' }}
      >
        <Card className="border-border-strong shadow-card">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-gold">
                Work in order
              </p>
              <CardTitle className="mt-1 text-[20px]">Needs attention</CardTitle>
            </div>
            <Link
              href="/intake"
              className="group inline-flex items-center gap-1 self-start rounded-pill border border-border bg-background px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:border-primary/35 hover:bg-primary/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:self-auto"
            >
              All queues
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </CardHeader>
          <CardBody className="gap-3 p-3 sm:p-4">
            {attentionItems.map((item) => (
              <AttentionRow key={item.id} item={item} />
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardBody>
            {activity === null ? (
              <div className="px-5 py-3 text-sm text-text-muted">
                Unable to load activity right now.
              </div>
            ) : activity.items.length === 0 ? (
              <div className="px-5 py-3 text-sm text-text-muted">
                No activity yet. New audit-log events will appear here.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {activity.items.map((entry) => (
                  <ActivityRow key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Membership metrics - profiles by state, pipeline, plan mix */}
      <MembershipMetrics metrics={metrics} />
    </div>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const Icon = ATTENTION_ICON[item.kind];
  const styles = ATTENTION_STYLE[item.severity];
  return (
    <div
      className={cn(
        'grid gap-3 rounded-lg border p-3 transition-colors sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-4',
        styles.row,
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg sm:size-11',
          styles.icon,
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]',
              styles.label,
            )}
          >
            {item.impact}
          </span>
          {item.count !== null ? (
            <span className="text-[11.5px] font-medium text-text-muted">
              {item.count} live
            </span>
          ) : null}
        </div>
        <h2 className="mt-1 text-[14px] font-semibold leading-5 text-text sm:text-[15px]">
          {item.title}
        </h2>
        <p className="mt-1 text-xs leading-5 text-text-muted sm:text-[13px]">
          {item.detail}
        </p>
      </div>
      <Link
        href={item.href}
        className={cn(
          'inline-flex items-center justify-center gap-1 rounded-[14px] border bg-background px-3.5 py-2 text-xs font-semibold transition-all hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:justify-self-end',
          styles.cta,
        )}
      >
        {item.cta}
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

function ActivityRow({ entry }: { entry: RecentActivityEntry }) {
  const actor =
    entry.actorType === 'automation'
      ? 'System'
      : (entry.actorDisplayName ?? 'Unknown');
  const body = (
    <div className="flex items-start gap-3 px-5 py-3">
      <span
        aria-hidden
        className={cn(
          'mt-1.5 size-1.5 shrink-0 rounded-full',
          ACTIVITY_DOT[entry.entityType] ?? ACTIVITY_DOT.other,
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] leading-5 text-text">
          <span className="font-medium">{entry.label}</span>
          {entry.entityLabel ? (
            <span className="text-text-muted"> - {entry.entityLabel}</span>
          ) : null}
        </div>
        <div className="mt-0.5 text-[11.5px] leading-4 text-text-muted">
          {actor} &middot; {formatRelative(entry.createdAt)}
        </div>
      </div>
      {entry.href ? (
        <ArrowRight className="mt-1 size-3.5 shrink-0 text-text-subtle transition-transform group-hover:translate-x-0.5" />
      ) : null}
    </div>
  );
  return (
    <li>
      {entry.href ? (
        <Link
          href={entry.href}
          className="group block transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30"
        >
          {body}
        </Link>
      ) : (
        body
      )}
    </li>
  );
}
