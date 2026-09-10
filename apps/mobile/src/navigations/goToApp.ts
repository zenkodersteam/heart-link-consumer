import { takePendingRoute } from '../lib/pending-route';
import { navigationRef } from './navigationRef';

/**
 * Into the app, landing wherever they were originally headed.
 *
 * Called at the end of signing in and of onboarding. A remembered destination
 * — a shared profile, a sponsor invite — is pushed *on top of* the tabs rather
 * than instead of them, so going back from it lands in the app instead of on
 * the sign-in screen they have just left.
 *
 * A reset, not a navigate: nothing from the signed-out stack should remain
 * behind for a swipe to reach.
 */
export async function goToApp(): Promise<void> {
  const pending = await takePendingRoute();
  if (!navigationRef.isReady()) return;

  if (pending && pending.name !== 'Tabs') {
    navigationRef.reset({
      index: 1,
      routes: [
        { name: 'Tabs' },
        // Params were stored alongside the name, so the screen opens on the
        // thing that was shared rather than on its empty state.
        { name: pending.name, params: pending.params as never },
      ],
    });
    return;
  }

  navigationRef.reset({ index: 0, routes: [{ name: 'Tabs' }] });
}
