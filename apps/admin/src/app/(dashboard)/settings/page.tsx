import { AlertTriangle, CheckCircle2, MapPin, SlidersHorizontal } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '../../../components/ui/card';
import { PageHero } from '../../../components/layout/PageHero';
import { serverApi } from '../../../lib/api';
import { MailFromForm } from '../../../components/settings/MailFromForm';
import { PlanSettingsTable } from '../../../components/settings/PlanSettingsTable';

export const dynamic = 'force-dynamic';

/**
 * Operational settings.
 *
 * Both surfaces here were previously engineer-only, and one of them silently
 * broke the product: the outbound return address lived in MAIL_FROM_* env vars,
 * was never set in production, and blocked every outbound letter - 6 real
 * letters sat queued from 2026-06-23 with no visible cause outside the logs.
 * Values that can stop the product working, and values the client will tweak,
 * belong in the admin UI.
 *
 * Layout follows the rest of the dashboard: `p-8` around a PageHero, then
 * cards. This screen had been built before PageHero existed and kept its own
 * tighter padding and hand-rolled heading, so it read as a different app - and
 * its one card passed no padding to CardBody, which has none by default, so the
 * return address form sat flush against the card border.
 */
export default async function SettingsPage() {
  const api = await serverApi();
  const [mail, planData] = await Promise.all([
    api.getMailFromSettings(),
    api.listPlanSettings(),
  ]);

  return (
    <div className="flex w-full flex-col gap-6 p-8">
      <PageHero
        eyebrow="Settings"
        title="Operational settings"
        description="Values staff can change without a deploy. Edits here take effect on the next letter or the next subscription check, not at the next release."
      />

      {/* ── Outbound return address ─────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-primary" />
          <h2 className="font-serif text-xl text-text">Outbound return address</h2>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-text-muted">
          Printed on every letter HeartLink mails, and where returned mail comes back to. Prison
          mailrooms return mail often, so this needs to be an address that is actually monitored.
        </p>

        <div
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            mail.configured
              ? 'border-success/40 bg-success-tint text-text'
              : 'border-danger/40 bg-danger-tint text-text'
          }`}
        >
          {mail.configured ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
          )}
          <div className="flex flex-col gap-1">
            <span className="font-medium">
              {mail.configured
                ? 'Outbound mail is ready to dispatch.'
                : 'Outbound mail is blocked - letters will queue but never send.'}
            </span>
            {mail.issues.length ? (
              <ul className="list-disc pl-4 text-text-muted">
                {mail.issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            ) : null}
            <span className="text-[12px] text-text-muted">
              Live value currently comes from{' '}
              <strong>{mail.source === 'app_config' ? 'this screen' : 'environment variables'}</strong>
              {mail.source === 'env' ? ' - saving below takes over from them.' : '.'}
            </span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Return address</CardTitle>
          </CardHeader>
          <CardBody className="px-5 py-6">
            <MailFromForm initial={mail.stored ?? null} />
          </CardBody>
        </Card>
      </section>

      {/* ── Plan entitlements ───────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 shrink-0 text-primary" />
          <h2 className="font-serif text-xl text-text">Plans and entitlements</h2>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-text-muted">
          These are not display copy. The daily like limit and included letters drive the live
          entitlement engines, so changing a number here changes what subscribers actually get, on
          their next action.
        </p>

        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-text-muted">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            Price is intentionally not editable here. Stripe prices are immutable, so changing an
            amount requires minting a new Stripe price - otherwise the amount shown and the amount
            charged drift apart. Run{' '}
            <code className="rounded-sm bg-background px-1 py-0.5 text-[12px]">
              scripts/stripe-sync-plans.ts
            </code>{' '}
            for price changes.
          </span>
        </div>

        <PlanSettingsTable plans={planData.plans} />
      </section>
    </div>
  );
}
