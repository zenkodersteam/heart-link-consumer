'use client';

import { useEffect } from 'react';
import { useNavCounts } from '../intake/NavCountsProvider';

export function PaymentsNavBadgeSync({ hideBadge }: { hideBadge: boolean }) {
  const { setOverride } = useNavCounts();

  useEffect(() => {
    setOverride(hideBadge ? { payments: 0 } : null);
    return () => setOverride(null);
  }, [hideBadge, setOverride]);

  return null;
}