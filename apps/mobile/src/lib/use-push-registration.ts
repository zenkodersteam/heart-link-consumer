import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useSession } from './session';
import { router } from 'expo-router';

import { useApiClientFactory } from './use-api-client';

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

    let cancelled = false;
    void (async () => {
      const token = await getExpoPushToken();
      if (!token || cancelled) return;

      try {
        const api = await factory();
        await api.registerPushToken(token, Platform.OS);
        registered.current = true;
      } catch {
        // Left unregistered so the next launch tries again, rather than being
        // marked done and never retried.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, factory]);

  // Opening a notification should land on the thing it was about, not the home
  // screen — being told a letter arrived and then having to go and find it is
  // most of the value gone.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) {
        router.push(url as never);
      }
    });
    return () => sub.remove();
  }, []);
}

/**
 * This device's push token, or null when we cannot have one.
 *
 * Null is an ordinary outcome — a simulator, or a refusal — and is not an error
 * worth surfacing.
 */
async function getExpoPushToken(): Promise<string | null> {
  // Simulators cannot receive pushes; asking produces a confusing failure.
  if (!Device.isDevice) return null;

  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;

    if (status !== 'granted') {
      // iOS only ever asks once, so this is the single chance.
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return null;

    // Android delivers nothing without a channel, and silently: no error, no
    // notification.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'HeartLink',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;

    const result = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return result.data ?? null;
  } catch {
    return null;
  }
}

/**
 * How a notification behaves while the app is open.
 *
 * Shown rather than swallowed: someone reading one thread should still be told
 * a letter landed in another.
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
