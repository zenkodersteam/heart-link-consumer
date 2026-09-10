import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import * as Device from 'expo-device';
import { useSession } from './session';

import { navigationRef } from '../navigations/navigationRef';
import type { PendingRoute } from './pending-route';
import { savePendingRoute } from './pending-route';
import { useApiClientFactory } from './use-api-client';

/**
 * Firebase messaging, or null where there is no native module behind it.
 *
 * Null is an ordinary state, not a failure: the web build has no Firebase
 * messaging, and neither does Expo Go, which is where most day-to-day work
 * happens. Calling `messaging()` there throws — and because the notification
 * handler is registered while the root layout module is still evaluating, that
 * throw took the whole provider tree with it and every screen came up with
 * "useSession must be used inside a SessionProvider".
 */
type MessagingModule = FirebaseMessagingTypes.Module;
type MessagingExport = (() => MessagingModule) & {
  AuthorizationStatus: { AUTHORIZED: number; PROVISIONAL: number };
};

/** Resolved once. `undefined` means "not looked yet", `null` means "not here". */
let cached: MessagingModule | null | undefined;
let cachedExport: MessagingExport | null = null;

function fcm(): MessagingModule | null {
  if (cached !== undefined) return cached;
  cached = null;

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return cached;
  try {
    // `require`, not a static import: @react-native-firebase throws while the
    // module is being *imported* when there is no native module behind it, and
    // this file is loaded from the root layout at module scope. A static import
    // therefore took the whole provider tree down before React rendered
    // anything — every screen came up saying "useSession must be used inside a
    // SessionProvider", which was never the real fault.
    //
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-firebase/messaging') as { default: MessagingExport };
    cachedExport = mod.default;
    cached = mod.default();
  } catch {
    cached = null;
  }
  return cached;
}

/**
 * Where a notification wants to send us, if anywhere.
 *
 * Read from `kind` and `threadId`, which the server sends as their own fields,
 * rather than by parsing the `url` it also sends. That URL exists for the
 * website; turning it back into a screen here would be a second copy of the
 * routing table, kept in step by hand. A payload naming a screen we do not
 * have simply opens the app.
 */
function destinationFrom(
  message: FirebaseMessagingTypes.RemoteMessage | null,
): PendingRoute | null {
  const kind = message?.data?.kind;
  const threadId = message?.data?.threadId;

  if (
    (kind === 'letter_reply' || kind === 'letter_approved' || kind === 'letter_rejected') &&
    typeof threadId === 'string'
  ) {
    return { name: 'Tabs', params: { screen: 'Mailbox', params: { thread: threadId } } };
  }
  if (kind === 'renewal_reminder') return { name: 'Tabs', params: { screen: 'Account' } };
  if (kind === 'profile_live') return { name: 'Tabs', params: { screen: 'Home' } };
  return null;
}

/**
 * Follow a tapped notification.
 *
 * Held rather than dropped when the app is not ready to show it — a cold
 * launch from a notification arrives before the navigator exists, and someone
 * signed out has to get through sign-in first. `goToApp` replays it.
 */
function follow(destination: PendingRoute | null): void {
  if (!destination) return;
  if (!navigationRef.isReady()) {
    savePendingRoute(destination);
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigationRef.navigate(destination.name as any, destination.params as never);
}

/**
 * Registers this device for notifications, and acts on one being opened.
 *
 * Deliberately not on first launch. Asking for notification permission before
 * anyone knows what the app does is the reliable way to be refused, and iOS
 * only asks once — a "no" here is close to permanent, and the notification that
 * matters most, a letter arriving, is then lost for good. So this runs once
 * somebody is signed in and has something to be notified about.
 *
 * Everything is best effort: no permission, a simulator, an unreachable API —
 * none of it should keep anyone out of the app.
 */
export function usePushRegistration(): void {
  const { isSignedIn } = useSession();
  const factory = useApiClientFactory();
  const registered = useRef(false);

  useEffect(() => {
    if (!isSignedIn || registered.current) return;

    // Each way out says so, once. A silent early return here was the whole
    // difficulty in telling "push is broken" from "push cannot run in this
    // build" — the log lived further down a path neither case ever reached.
    const service = fcm();
    if (!service) {
      if (__DEV__) {
        console.log(
          '[push] no native Firebase messaging in this build — Expo Go and the web build have none. Use `npx expo run:ios --device`.',
        );
      }
      return;
    }

    let cancelled = false;

    const send = async (token: string) => {
      try {
        const api = await factory();
        await api.registerPushToken(token, Platform.OS);
        registered.current = true;
        // Only in development, and only the ends of the token: the whole thing
        // in a log is enough to push to somebody's phone.
        if (__DEV__) {
          console.log(
            `[push] registered ${Platform.OS} token ${token.slice(0, 12)}…${token.slice(-6)} (${token.length} chars)`,
          );
        }
      } catch (err) {
        // Left unregistered so the next launch tries again, rather than being
        // marked done and never retried. Silent in production — a phone that
        // cannot be reached must never interrupt anyone — but saying nothing at
        // all while testing is how a broken registration goes unnoticed.
        if (__DEV__) console.warn('[push] could not register this device:', err);
      }
    };

    void (async () => {
      const token = await getFcmToken();
      if (!token || cancelled) return;
      await send(token);
    })();

    // FCM rotates a token on its own — a restore to a new device, a reinstall,
    // clearing app data. Without this the server keeps pushing at an address
    // nobody is listening to any more.
    const unsubscribe = service.onTokenRefresh((token) => {
      registered.current = false;
      void send(token);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [isSignedIn, factory]);

  // Opening a notification should land on the thing it was about, not the home
  // screen — being told a letter arrived and then having to go and find it is
  // most of the value gone.
  useEffect(() => {
    const service = fcm();
    if (!service) return;

    // The app was already running, in the background.
    const unsubscribe = service.onNotificationOpenedApp((message) => {
      follow(destinationFrom(message));
    });

    // The app was not running at all: the notification is what started it, and
    // is reported once, here, rather than through the listener above.
    void service
      .getInitialNotification()
      .then((message) => {
        follow(destinationFrom(message));
      })
      .catch(() => undefined);

    return unsubscribe;
  }, []);
}

/**
 * This device's FCM token, or null when we cannot have one.
 *
 * Null is an ordinary outcome — a simulator, or a refusal — and is not an error
 * worth surfacing.
 */
export async function getFcmToken(): Promise<string | null> {
  // An iOS simulator has no APNs connection at all, so asking produces a
  // confusing failure. An Android emulator with Play services does receive
  // FCM perfectly well — the old check blocked both, and rejecting a device
  // that works is how Android came to look broken.
  if (Platform.OS === 'ios' && !Device.isDevice) {
    if (__DEV__) console.log('[push] iOS simulator: no push tokens are issued here');
    return null;
  }

  const service = fcm();
  if (!service) return null;

  try {
    const status = await service.requestPermission();
    const granted =
      status === cachedExport?.AuthorizationStatus.AUTHORIZED ||
      status === cachedExport?.AuthorizationStatus.PROVISIONAL;
    if (!granted) {
      if (__DEV__) console.log('[push] notifications were not permitted');
      return null;
    }

    // iOS hands out an APNs token first, and Firebase cannot mint an FCM token
    // until it has one. It is normally registered automatically, but saying so
    // explicitly removes the race on a first launch, where the token was
    // sometimes asked for before APNs had answered.
    if (Platform.OS === 'ios' && !service.isDeviceRegisteredForRemoteMessages) {
      await service.registerDeviceForRemoteMessages();
    }

    const token = (await service.getToken()) || null;
    if (__DEV__ && !token) console.warn('[push] Firebase returned no token');
    return token;
  } catch (err) {
    if (__DEV__) console.warn('[push] could not get a token:', err);
    return null;
  }
}

/**
 * How a notification behaves while the app is open.
 *
 * The OS shows nothing for a message that arrives in the foreground, which is
 * correct — the banner would cover the screen someone is already looking at —
 * but a letter landing in another thread is still worth knowing about. The
 * handler is registered here and the app decides what to draw.
 *
 * Registered at module scope, alongside the background handler, because
 * Firebase requires both to be set before the app finishes starting.
 */
export function configureNotificationHandler(): void {
  // A data-only message delivered while the app is in the background or
  // killed. Nothing is drawn from here; the OS has already shown the
  // notification, and this exists so the SDK does not warn on every delivery.
  //
  // This runs at module scope, before React has rendered anything, so it must
  // never throw: an exception here is not a broken notification, it is a blank
  // app.
  fcm()?.setBackgroundMessageHandler(async () => undefined);
}
