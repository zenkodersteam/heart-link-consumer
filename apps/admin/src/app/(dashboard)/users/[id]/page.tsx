import { notFound } from 'next/navigation';

import {
  AccountPanel,
  DevicesPanel,
  MembershipPanel,
  PaymentsPanel,
  ProfilePanel,
} from '../../../../components/users/UserPanels';
import { UserHeader } from '../../../../components/users/UserHeader';
import { UserStats } from '../../../../components/users/UserStats';
import { serverApi } from '../../../../lib/api';

export const dynamic = 'force-dynamic';

/**
 * One member, on one screen.
 *
 * Ordered by the questions staff arrive with: who is this, what have they done,
 * then the detail behind it. The two columns are deliberately uneven — account
 * and profile are read, payments and devices are checked.
 */
export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = await serverApi();

  const user = await api.getAdminUser(id).catch(() => null);
  if (!user) notFound();

  return (
    <div className="flex w-full flex-col gap-6 p-8">
      <UserHeader user={user} />
      <UserStats user={user} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <AccountPanel user={user} />
          <ProfilePanel user={user} />
        </div>
        <div className="flex flex-col gap-4">
          <MembershipPanel user={user} />
          <PaymentsPanel user={user} />
          <DevicesPanel user={user} />
        </div>
      </div>
    </div>
  );
}
