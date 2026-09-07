/**
 * Confidence bucketing for OCR fields.
 *
 * Thresholds match what's shown in Figma screen 4 (node 17:140):
 *   - 98% / 95% / 91% / 96% / 88%  → green  (high)
 *   - 83% / 72%                    → orange (mid, input gets orange border)
 *   - 45%                          → red    (low,  input gets red 2px border)
 */
export type ConfidenceBucket = 'high' | 'mid' | 'low' | 'missing';

export function bucketConfidence(confidence: number | null | undefined): ConfidenceBucket {
  if (confidence == null || Number.isNaN(confidence)) return 'missing';
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.7) return 'mid';
  return 'low';
}

/** Class names for confidence % text (badge-less, inline) */
export function confidenceTextClass(bucket: ConfidenceBucket): string {
  switch (bucket) {
    case 'high':
      return 'text-success';
    case 'mid':
      return 'text-warning';
    case 'low':
      return 'text-danger';
    case 'missing':
      return 'text-text-muted';
  }
}

/** Class names for the input's border (review workspace field) */
export function confidenceBorderClass(bucket: ConfidenceBucket): string {
  switch (bucket) {
    case 'high':
      return 'border border-border';
    case 'mid':
      return 'border border-warning';
    case 'low':
      return 'border-2 border-danger';
    case 'missing':
      return 'border border-dashed border-border';
  }
}

/** Dot color for the applicant-info-card left-side indicator */
export function confidenceDotClass(bucket: ConfidenceBucket): string {
  switch (bucket) {
    case 'high':
      return 'bg-success';
    case 'mid':
      return 'bg-warning';
    case 'low':
      return 'bg-danger';
    case 'missing':
      return 'bg-border';
  }
}

export function formatConfidencePct(confidence: number | null | undefined): string {
  if (confidence == null || Number.isNaN(confidence)) return '-';
  return `${Math.round(confidence * 100)}%`;
}
