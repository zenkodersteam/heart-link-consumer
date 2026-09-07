'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import type { NavCounts } from '@heartlink/api-contract';

type NavCountsOverride = Partial<NavCounts> | null;

interface NavCountsContextValue {
  counts?: NavCounts;
  setOverride: (override: NavCountsOverride) => void;
}

const NavCountsContext = createContext<NavCountsContextValue | null>(null);

export function NavCountsProvider({
  children,
  initialCounts,
}: {
  children: React.ReactNode;
  initialCounts?: NavCounts;
}) {
  const [override, setOverride] = useState<NavCountsOverride>(null);

  const counts = useMemo(() => {
    if (!initialCounts) return undefined;
    return override ? { ...initialCounts, ...override } : initialCounts;
  }, [initialCounts, override]);

  return (
    <NavCountsContext.Provider value={{ counts, setOverride }}>
      {children}
    </NavCountsContext.Provider>
  );
}

export function useNavCounts() {
  const context = useContext(NavCountsContext);
  if (!context) {
    throw new Error('useNavCounts must be used within NavCountsProvider');
  }
  return context;
}