import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';

/**
 * Navigating from outside React.
 *
 * A tapped notification arrives in a handler with no component around it, so
 * there is no `useNavigation` to call. Every helper here is a no-op until the
 * container is ready — a push can land while the app is still starting, and
 * dropping that navigation is better than throwing on a cold launch.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<Route extends keyof RootStackParamList>(
  name: Route,
  ...params: RootStackParamList[Route] extends undefined
    ? []
    : [RootStackParamList[Route]]
): void {
  if (!navigationRef.isReady()) return;
  // The cast is the price of a variadic wrapper; the call site is typed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigationRef.navigate(name as any, ...(params as [never]));
}

/** Back to a signed-out app, with nothing of the old session left on the stack. */
export function resetToWelcome(): void {
  if (!navigationRef.isReady()) return;
  navigationRef.reset({ index: 0, routes: [{ name: 'Welcome' }] });
}
