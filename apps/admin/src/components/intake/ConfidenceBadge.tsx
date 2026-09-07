import { cn } from '../../lib/utils';
import {
  bucketConfidence,
  confidenceTextClass,
  formatConfidencePct,
} from '../../lib/confidence';

export function ConfidenceBadge({
  confidence,
  className,
}: {
  confidence: number | null | undefined;
  className?: string;
}) {
  const bucket = bucketConfidence(confidence);
  return (
    <span
      className={cn(
        'text-[11px] font-medium leading-[14px]',
        confidenceTextClass(bucket),
        className,
      )}
    >
      {formatConfidencePct(confidence)}
    </span>
  );
}
