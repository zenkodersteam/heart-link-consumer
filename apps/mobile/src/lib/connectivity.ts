import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

/**
 * Whether the app can currently reach HeartLink.
 *
 * Deliberately not a radio-state check. What matters to a member is not
 * "is wifi on" but "did my request arrive" — a captive portal, a blocked
 * network or a server outage all leave the radio perfectly happy while nothing
 * works. So the signal comes from real request outcomes: the API client reports
 * every success and every network-level failure here, and screens read it.
 *
 * This also avoids a native dependency, which would mean rebuilding the app.
 *
 * On the web the browser's own online/offline events are folded in as an
 * immediate hint, so a pulled cable shows up without waiting for a request to
 * time out.
 */

let offline = false;
const listeners = new Set<() => void>();

function set(next: boolean): void {
  if (offline === next) return;
  offline = next;
  for (const l of listeners) l();
}

/** Called by the API client when a request completes, at any status code. */
export function reportReachable(): void {
  set(false);
}

/** Called by the API client when a request never reached the server. */
export function reportUnreachable(): void {
  set(true);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('offline', () => set(true));
  // Back online is only a hint: the browser knows there is a network, not that
  // our API answers on it. Clear the flag and let the next request confirm.
  window.addEventListener('online', () => set(false));
}

const getSnapshot = (): boolean => offline;

/** True while the last thing we heard from the API was that it was unreachable. */
export function useIsOffline(): boolean {
  // Server snapshot is always "online": a static render has made no requests,
  // and showing an offline banner in prerendered HTML would be wrong.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
