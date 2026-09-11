'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Camera, Star, CheckSquare, Square, Check, X } from 'lucide-react';
import type { PendingPhoto } from '@heartlink/api-contract';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import {
  bulkModeratePhotos,
  moderatePhoto,
  setPrimaryPhoto,
} from '../../lib/actions';
import { LocalTime } from '@/components/ui/LocalTime';

export function PhotoReviewGrid({ items }: { items: PendingPhoto[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  const bulkAction = (status: 'approved' | 'rejected') => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      try {
        const res = await bulkModeratePhotos({ photoIds: ids, status });
        toast.success(`${res.updated} photo${res.updated === 1 ? '' : 's'} ${status}`);
        setSelected(new Set());
      } catch (err) {
        toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  const onApprove = (photoId: string, profileId: string) =>
    startTransition(async () => {
      try {
        await moderatePhoto({ profileId, photoId, status: 'approved' });
        toast.success('Approved');
      } catch (err) {
        toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  const onReject = (photoId: string, profileId: string) =>
    startTransition(async () => {
      try {
        await moderatePhoto({ profileId, photoId, status: 'rejected' });
        toast.success('Rejected');
      } catch (err) {
        toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

  if (items.length === 0) {
    return (
      <div className="flex w-full items-center justify-center rounded-lg border border-border bg-background px-6 py-16 text-sm text-text-muted">
        Photo review queue is empty.
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', isPending && 'opacity-70')}>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3">
        <button
          type="button"
          onClick={selectAll}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {selected.size === items.length ? (
            <>
              <CheckSquare className="size-4" /> Deselect All
            </>
          ) : (
            <>
              <Square className="size-4" /> Select All
            </>
          )}
        </button>
        <Button
          variant="success"
          size="sm"
          onClick={() => bulkAction('approved')}
          disabled={selected.size === 0 || isPending}
        >
          Approve Selected ({selected.size})
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => bulkAction('rejected')}
          disabled={selected.size === 0 || isPending}
        >
          Reject Selected
        </Button>
      </div>

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {items.map((p) => {
          const isSelected = selected.has(p.id);
          return (
            <li
              key={p.id}
              className={cn(
                'flex flex-col overflow-hidden rounded-lg border bg-background',
                isSelected ? 'border-primary' : 'border-border',
              )}
            >
              <div className="relative aspect-[4/3] bg-surface">
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  className="absolute left-2 top-2 z-10 flex size-5 items-center justify-center rounded border border-white/60 bg-white/40 text-white transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label={isSelected ? 'Deselect photo' : 'Select photo'}
                >
                  {isSelected ? <CheckSquare className="size-3.5" /> : <Square className="size-3.5" />}
                </button>
                {p.presignedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.presignedUrl}
                    alt="Pending"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-text-muted">
                    <Camera className="size-8" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 p-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-text">
                    {p.profileDisplayName ?? '-'}
                  </span>
                  <span className="text-[12px] text-text-muted">
                    {p.facilityName ?? '-'}
                  </span>
                  <span className="text-[12px] text-text-muted">
                    <LocalTime value={p.createdAt} />
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="success"
                    size="xs"
                    onClick={() => onApprove(p.id, p.profileId)}
                    disabled={isPending}
                  >
                    <Check className="size-3.5" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => onReject(p.id, p.profileId)}
                    disabled={isPending}
                  >
                    <X className="size-3.5" /> Reject
                  </Button>
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          await setPrimaryPhoto({
                            profileId: p.profileId,
                            photoId: p.id,
                          });
                          toast.success('Set primary');
                        } catch (err) {
                          toast.error(
                            `Failed: ${err instanceof Error ? err.message : String(err)}`,
                          );
                        }
                      })
                    }
                    className="text-accent-gold transition-all active:scale-95 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    aria-label="Set as primary"
                    title="Set as primary (only after approval)"
                  >
                    <Star className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
