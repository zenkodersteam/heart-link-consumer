import { ToggleBadge } from '../ui/ToggleBadge';
import Link from 'next/link';
import type { Facility, Profile } from '@heartlink/api-contract';
import { ProfileStatusBadge } from './ProfileStatusBadge';
import { formatShortDate } from '../../lib/utils';
import { formatFacilityLabel } from '../../lib/adminDisplay';

export interface ProfileRowExtras {
  approvedPhotoCount: number;
  hasPrimary: boolean;
  paymentLabel: string;
  blockerSummary: string;
}

export function ProfilesTable({
  items,
  extras,
  facilitiesById,
}: {
  items: Profile[];
  extras: Record<string, ProfileRowExtras>;
  facilitiesById: Record<string, Facility>;
}) {
  if (items.length === 0) {
    return (
      <div className="hl-empty-state flex w-full items-center justify-center px-6 py-16 text-sm">
        No profiles match the current filters.
      </div>
    );
  }
  return (
    <div className="hl-table-shell w-full">
      <div className="hl-table-head flex items-center px-4 py-3 text-[13px] font-medium leading-[18px]">
        <div className="flex-[1.4] min-w-0">Profile Name</div>
        <div className="flex-1 min-w-0">Facility</div>
        <div className="flex-1 min-w-0">Status</div>
        <div className="w-[80px]">Photos</div>
        <div className="w-[80px]">Primary</div>
        <div className="flex-1 min-w-0">Payment</div>
        <div className="flex-[1.3] min-w-0">Blockers</div>
        <div className="w-[110px]">Created</div>
        <div className="w-[110px]">Updated</div>
      </div>
      {items.map((row, idx) => {
        const zebra = idx % 2 === 1;
        const x = extras[row.id] ?? {
          approvedPhotoCount: 0,
          hasPrimary: false,
          paymentLabel: '-',
          blockerSummary: '-',
        };
        return (
          <Link
            key={row.id}
            href={`/profiles/${row.id}`}
            className={`flex items-center border-b border-border px-4 py-3.5 text-sm leading-5 text-text transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30 cursor-pointer ${
              zebra ? 'bg-surface-muted' : 'bg-background'
            }`}
          >
            <div className="flex-[1.4] min-w-0 truncate font-medium">
              {row.displayName ?? '-'}
            </div>
            <div className="flex-1 min-w-0 truncate">
              {formatFacilityLabel(facilitiesById[row.facilityId])}
            </div>
            <div className="flex-1 min-w-0">
              <ProfileStatusBadge status={row.status} />
            </div>
            <div className="w-[80px] tabular-nums">{x.approvedPhotoCount}</div>
            <div className="w-[80px]">
              <ToggleBadge on={x.hasPrimary} onLabel="Set" offLabel="Missing" />
            </div>
            <div className="flex-1 min-w-0 truncate">{x.paymentLabel}</div>
            <div className="flex-[1.3] min-w-0 truncate">{x.blockerSummary}</div>
            <div className="w-[110px]">{formatShortDate(row.createdAt)}</div>
            <div className="w-[110px]">{formatShortDate(row.updatedAt)}</div>
          </Link>
        );
      })}
    </div>
  );
}
