import Link from 'next/link';
import { moderateOutsideProfile } from '../../../lib/actions';
import { FlagQueue } from '../../../components/moderation/FlagQueue';
import { PageHero } from '../../../components/layout/PageHero';
import { Button } from '../../../components/ui/button';
import { serverApi } from '../../../lib/api';
import { MarkSectionSeen } from '../../../components/shell/MarkSectionSeen';

export const dynamic = 'force-dynamic';

export default async function ModerationPage() {
  const api = await serverApi();
  const [pending, outsideProfiles, flags] = await Promise.all([
    api.listPendingCommunications(),
    api.listPendingOutsideProfiles().catch(() => []),
    api.listModerationFlags({ limit: 50 }),
  ]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <MarkSectionSeen section="moderation" />
      <PageHero
        eyebrow="Trust Operations"
        title="Moderation & Trust"
        description="Reports raised by members, and member profiles waiting for review."
        actions={
          <span className="inline-flex items-center rounded-pill-lg bg-warning-tint px-3 py-1.5 text-xs font-medium text-warning">
            {flags.total} open {flags.total === 1 ? 'report' : 'reports'}
          </span>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="text-lg font-semibold text-text">Reported items</h2>
        <span className="inline-flex items-center rounded-pill-lg bg-warning-tint px-3 py-1.5 text-xs font-medium text-warning">
          {flags.total} open
        </span>
      </div>
      <FlagQueue flags={flags.items} />

      {/* Letters have their own screen now; a second copy of that queue here
          would be two places to approve the same thing, and two chances to
          approve it twice. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm">
        <span className="text-text-muted">
          {pending.total} {pending.total === 1 ? 'letter is' : 'letters are'} waiting to be approved.
        </span>
        <Link href="/letters" className="font-medium text-primary hover:underline">
          Go to letters →
        </Link>
      </div>

      {/* Outside-member profile queue: new/edited consumer profiles await
          approval before their letters can send. */}
      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Member profiles</h2>
        <span className="inline-flex items-center rounded-pill-lg bg-warning-tint px-3 py-1.5 text-xs font-medium text-warning">
          {outsideProfiles.length} pending
        </span>
      </div>
      {outsideProfiles.length === 0 ? (
        <div className="hl-empty-state flex w-full items-center justify-center px-6 py-10 text-sm">
          No member profiles are waiting for review.
        </div>
      ) : (
        <div className="hl-table-shell">
          <div className="hl-table-head flex items-center px-4 py-3 text-[13px] font-medium leading-[18px]">
            <div className="w-[72px]">Photo</div>
            <div className="flex-[1] min-w-0">Name</div>
            <div className="w-[150px]">Location</div>
            <div className="flex-[2] min-w-0">Bio</div>
            <div className="w-[220px]">Action</div>
          </div>
          {outsideProfiles.map((p, idx) => (
            <div
              key={p.id}
              className={`flex items-center border-b border-border px-4 py-3.5 text-sm leading-5 text-text ${idx % 2 === 1 ? 'bg-surface-muted' : 'bg-background'}`}
            >
              <div className="w-[72px]">
                {p.primaryPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.primaryPhotoUrl}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-surface-muted" />
                )}
              </div>
              <div className="flex-[1] min-w-0 truncate font-medium">
                {p.displayName || 'Unnamed member'}
              </div>
              <div className="w-[150px] truncate">{p.location || '-'}</div>
              <div className="flex-[2] min-w-0 pr-4 text-text-muted">{p.bio || 'No bio yet'}</div>
              <div className="w-[220px]">
                <div className="flex gap-2">
                  <form action={async () => {
                    'use server';
                    await moderateOutsideProfile({ profileId: p.id, decision: 'approved' });
                  }}>
                    <Button variant="primary" size="xs" type="submit">
                      Approve
                    </Button>
                  </form>
                  <form action={async () => {
                    'use server';
                    await moderateOutsideProfile({ profileId: p.id, decision: 'rejected' });
                  }}>
                    <Button variant="outline" size="xs" type="submit" className="text-danger">
                      Reject
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
