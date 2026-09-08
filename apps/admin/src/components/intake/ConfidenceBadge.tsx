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
  // A high score is the normal case, and printing it beside all fifty-three
  // fields turned a signal into wallpaper - a screen of green percentages that
  // the eye stops reading, which is exactly where a red one gets missed. The
  // field's own border already marks it as fine. Only doubt is worth the ink.
  if (bucket === 'high') return null;
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
