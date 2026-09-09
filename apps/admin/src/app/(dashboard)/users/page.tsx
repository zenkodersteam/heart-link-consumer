import type { ListAdminUsersQuery, OutsideProfileStatus } from '@heartlink/api-contract';

import { Pagination } from '../../../components/intake/Pagination';
import { PageHero } from '../../../components/layout/PageHero';
import { UsersFilters } from '../../../components/users/UsersFilters';
import { UsersTable } from '../../../components/users/UsersTable';
import { serverApi } from '../../../lib/api';

export const dynamic = 'force-dynamic';

function parseIntOr(value: string | string[] | undefined, fallback: number): number {
  const parsed = parseInt(Array.isArray(value) ? value[0] : (value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * The member directory.
 *
 * Outside users had no screen at all: the only place one appeared was the
 * combobox on the inbound-mail form, which meant answering "who is this person
 * and what have they got" involved querying the database by hand.
 */
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const status = (Array.isArray(sp.status) ? sp.status[0] : sp.status) as
    | OutsideProfileStatus
    | 'none'
    | undefined;

  const query: ListAdminUsersQuery = {
    q: (Array.isArray(sp.q) ? sp.q[0] : sp.q) || undefined,
    status: status || undefined,
    limit: parseIntOr(sp.limit, 25),
    offset: parseIntOr(sp.offset, 0),
  };

  const api = await serverApi();
  const response = await api.listAdminUsers(query);

  return (
    <div className="flex w-full flex-col gap-6 p-8">
      <PageHero
        eyebrow="Members"
        title="Members"
        description="Everyone who writes to a listing: their account, their own profile, and what they have sent."
      />

      <UsersFilters />

      <UsersTable items={response.items} />

      <Pagination
        total={response.total}
        limit={response.limit ?? query.limit ?? 25}
        offset={response.offset ?? query.offset ?? 0}
      />
    </div>
  );
}
