import type { OutboundMailStage } from '@heartlink/api-contract';
import { cn } from '../../lib/utils';

const LABELS: Record<OutboundMailStage, string> = {
  queued: 'Queued',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  returned: 'Returned',
};

const TONES: Record<OutboundMailStage, string> = {
  queued: 'bg-warning-tint text-warning',
  in_transit: 'bg-info-tint text-info',
  delivered: 'bg-success-tint text-success',
  returned: 'bg-danger-tint text-danger',
};

export function StageBadge({ stage }: { stage: OutboundMailStage }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        TONES[stage],
      )}
    >
      {LABELS[stage]}
    </span>
  );
}