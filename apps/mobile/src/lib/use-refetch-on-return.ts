import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Run `refetch` whenever the member might be coming back with something new:
 * the app returning to the foreground, or this screen being focused again.
 *
 * The case this exists for is paying. Memberships are bought on the website,
 * so the purchase happens outside the app — in the in-app browser, or in
 * Safari — and the tabs that show a membership are kept mounted between
 * visits. They fetched it once, on mount, and never asked again; a member who
 * had just subscribed came back to a mailbox that still said they had not,
 * and only a restart would change its mind.
 *
 * Skips the very first focus, which the screen's own mount effect already
 * covers, so opening a tab does not fetch twice.
 */
export function useRefetchOnReturn(refetch: () => void) {
  const latest = useRef(refetch);
  useEffect(() => {
    latest.current = refetch;
  }, [refetch]);

  useEffect(() => {
    let previous = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      if (previous.match(/inactive|background/) && next === 'active') latest.current();
      previous = next;
    });
    return () => sub.remove();
  }, []);

  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      latest.current();
    }, []),
  );
}

/**
 * Ask again a couple of times after the member comes back from paying.
 *
 * The browser closes the moment checkout says "done", but the membership is
 * switched on by the payment provider's webhook, which can land a few seconds
 * later. One refetch on return would often catch the moment before it, and the
 * screen would still show no membership. These follow-ups cover that gap and
 * cost nothing once the answer has changed.
 */
export function refetchAfterCheckout(refetch: () => void) {
  refetch();
  setTimeout(refetch, 3_000);
  setTimeout(refetch, 8_000);
}
