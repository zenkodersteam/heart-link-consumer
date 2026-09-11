import { Smartphone } from 'lucide-react';
import type { AdminUserDetail } from '@heartlink/api-contract';

import { Card, CardBody, CardHeader, CardTitle } from '../ui/card';
import { PaymentStatusBadge } from '../payments/PaymentStatusBadge';
import { formatShortDate } from '../../lib/utils';
import { LocalTime } from '@/components/ui/LocalTime';

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** One label-and-value line. The label column is fixed so the values align. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 border-b border-border px-5 py-2.5 last:border-b-0">
      <dt className="w-[150px] shrink-0 text-[13px] text-text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm text-text">{children}</dd>
    </div>
  );
}

export function AccountPanel({ user }: { user: AdminUserDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardBody>
        <dl>
          <Row label="Email">{user.email}</Row>
          <Row label="Verified">
            <LocalTime value={user.emailVerifiedAt} fallback="Not yet" />
          </Row>
          <Row label="Password">
            {user.hasPassword
              ? `Set ${formatShortDate(user.passwordSetAt)}`
              : 'None — signs in with an emailed code'}
          </Row>
          <Row label="Onboarding">{user.onboardingStatus ?? '—'}</Row>
          <Row label="Terms accepted">{formatShortDate(user.termsAcceptedAt)}</Row>
          <Row label="Privacy accepted">{formatShortDate(user.privacyAcceptedAt)}</Row>
          {/* Last, and small: staff need it to search logs, and never to read. */}
          <Row label="User ID">
            <code className="rounded bg-surface px-1.5 py-0.5 text-[12px] text-text-muted">
              {user.id}
            </code>
          </Row>
        </dl>
      </CardBody>
    </Card>
  );
}

export function ProfilePanel({ user }: { user: AdminUserDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Their profile</CardTitle>
      </CardHeader>
      <CardBody>
        {user.profile ? (
          <dl>
            <Row label="Shown as">{user.profile.displayName ?? '—'}</Row>
            <Row label="Submitted">{formatShortDate(user.profile.submittedAt)}</Row>
            <Row label="Reviewed">{formatShortDate(user.profile.reviewedAt)}</Row>
            {user.profile.moderationNotes ? (
              <Row label="Reviewer notes">
                <span className="whitespace-pre-line text-text-muted">
                  {user.profile.moderationNotes}
                </span>
              </Row>
            ) : null}
          </dl>
        ) : (
          <p className="px-5 py-6 text-sm text-text-muted">
            This member has not started a profile, so they cannot write letters yet.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

export function MembershipPanel({ user }: { user: AdminUserDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Membership</CardTitle>
      </CardHeader>
      <CardBody>
        {user.subscription ? (
          <dl>
            <Row label="Plan">{user.subscription.planName ?? '—'}</Row>
            <Row label="Status">{user.subscription.status}</Row>
            <Row label="Period ends">{formatShortDate(user.subscription.currentPeriodEnd)}</Row>
            <Row label="Renews">{formatShortDate(user.subscription.renewalDate)}</Row>
          </dl>
        ) : (
          <p className="px-5 py-6 text-sm text-text-muted">No membership on this account.</p>
        )}
      </CardBody>
    </Card>
  );
}

/**
 * Registered devices.
 *
 * Only ever the platform and when it was last reached — never the token, which
 * is a credential: anyone holding one can push a notification to that phone.
 */
export function DevicesPanel({ user }: { user: AdminUserDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Devices</CardTitle>
      </CardHeader>
      <CardBody>
        {user.devices.length === 0 ? (
          <p className="px-5 py-6 text-sm text-text-muted">
            No device registered, so notifications reach this member by email only.
          </p>
        ) : (
          <ul>
            {user.devices.map((device) => (
              <li
                key={device.id}
                className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0"
              >
                <Smartphone aria-hidden className="size-4 shrink-0 text-text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm capitalize text-text">{device.platform}</span>
                  <span className="block text-[12px] text-text-muted">
                    Added {formatShortDate(device.createdAt)}
                    {device.lastUsedAt ? ` · last reached ${formatShortDate(device.lastUsedAt)}` : ''}
                  </span>
                </span>
                {device.disabledAt ? (
                  <span className="shrink-0 rounded-pill bg-neutral-tint px-2 py-0.5 text-[11px] font-medium text-neutral">
                    Retired
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

export function PaymentsPanel({ user }: { user: AdminUserDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent payments</CardTitle>
      </CardHeader>
      <CardBody>
        {user.payments.length === 0 ? (
          <p className="px-5 py-6 text-sm text-text-muted">Nothing received from this member.</p>
        ) : (
          <ul>
            {user.payments.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-text">
                    {payment.paymentNumber ?? 'Unnumbered'}
                  </span>
                  <span className="block text-[12px] text-text-muted">
                    {formatShortDate(payment.receivedDate)}
                    {payment.purpose ? ` · ${payment.purpose}` : ''}
                  </span>
                </span>
                <PaymentStatusBadge status={payment.status} />
                <span className="w-[80px] shrink-0 text-right text-sm font-medium text-text">
                  {money(payment.amountCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
