import { useEffect, useState } from 'react';
import { useIsOffline } from '@heartlink/consumer-api';

/**
 * Offline, but only once it has stayed that way.
 *
 * `useIsOffline` flips on a single request that never reached the server, which
 * is the right signal — but a lone timeout on a train, or one request cancelled
 * as a screen unmounts, flips it for a moment and back. The banner it drives
 * sits in the layout above every screen, so each of those blips pushed the whole
 * app down a row and pulled it back up: cards on the home deck appearing to
 * shift on their own, with nothing on screen explaining why.
 *
 * So: wait before saying it, and say it immediately when it clears. Being a
 * second late to report a real outage costs nothing — the screens handle their
 * own failures — while being early costs a visible jolt on every screen.
 */
export function useSettledOffline(delayMs = 2500): boolean {
  const offline = useIsOffline();
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!offline) {
      // Recovery is not delayed: the banner should go the moment it is wrong.
      setSettled(false);
      return;
    }
    const timer = setTimeout(() => setSettled(true), delayMs);
    return () => clearTimeout(timer);
  }, [offline, delayMs]);

  return settled;
}
