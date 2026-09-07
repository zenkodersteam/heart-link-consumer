import { useCallback, useState } from 'react';

/**
 * Pull-to-refresh state with a floor on how long the spinner stays up.
 *
 * Against a local or fast API the work finishes inside a frame, so the
 * indicator appears and vanishes before it can be seen and the pull feels like
 * it did nothing. Native apps hold the spinner briefly so the gesture is
 * acknowledged. This waits out the shorter of the two, never the sum.
 */
const MIN_VISIBLE_MS = 650;

export function useRefresh(run: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const started = Date.now();
    try {
      await run();
    } finally {
      const elapsed = Date.now() - started;
      if (elapsed < MIN_VISIBLE_MS) {
        await new Promise((r) => setTimeout(r, MIN_VISIBLE_MS - elapsed));
      }
      setRefreshing(false);
    }
  }, [run]);

  return { refreshing, onRefresh };
}
