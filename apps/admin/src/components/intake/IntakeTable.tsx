import Link from 'next/link';
import type { Application, Facility } from '@heartlink/api-contract';
import { StatusBadge } from './StatusBadge';
import { formatShortDate } from '../../lib/utils';
import { formatFacilityLabel } from '../../lib/adminDisplay';

export function IntakeTable({
  items,
  facilitiesById,
}: {
  items: Application[];
  facilitiesById: Record<string, Facility>;
}) {
  if (items.length === 0) {
    return (
      <div className="hl-empty-state flex w-full items-center justify-center px-6 py-16 text-sm">
        No applications match the current filters.
      </div>
    );
  }
  return (
    <div className="hl-table-shell w-full">
      <div className="hl-table-head flex items-center px-4 py-3 text-[13px] font-medium leading-[18px]">
        <div className="flex-1 min-w-0">App Number</div>
        <div className="flex-1 min-w-0">Applicant Name</div>
        <div className="flex-1 min-w-0">Facility</div>
        <div className="flex-1 min-w-0">Status</div>
        <div className="flex-1 min-w-0">Date Received</div>
        <div className="flex-1 min-w-0">Last Updated</div>
        <div className="flex-1 min-w-0">Assigned To</div>
      </div>
      {items.map((row, idx) => {
        const zebra = idx % 2 === 1;
        return (
          <Link
            key={row.id}
            href={`/intake/${row.id}`}
            className={`flex items-center border-b border-border px-4 py-3.5 text-sm leading-5 text-text transition-colors hover:bg-primary-tint/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30 cursor-pointer ${
              zebra ? 'bg-surface-muted' : 'bg-background'
            }`}
          >
            <div className="flex-1 min-w-0 truncate">{row.applicationNumber}</div>
            <div className="flex-1 min-w-0 truncate text-text-muted">
              {/* Applicant name is in OCR fields - show "-" until backfilled */}
              -
            </div>
            <div className="flex-1 min-w-0 truncate">
              {formatFacilityLabel(facilitiesById[row.facilityId])}
            </div>
            <div className="flex-1 min-w-0">
              <StatusBadge status={row.status} />
            </div>
            <div className="flex-1 min-w-0">{formatShortDate(row.createdAt)}</div>
            <div className="flex-1 min-w-0">{formatShortDate(row.updatedAt)}</div>
            <div className="flex-1 min-w-0 truncate text-text-muted">
              {row.assignedStaffId ? 'Assigned' : 'Unassigned'}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
