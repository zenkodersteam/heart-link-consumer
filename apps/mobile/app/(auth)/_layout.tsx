import { useSession } from '../../src/lib/session';
import { Redirect, Stack } from 'expo-router';

import { PREVIEW_BYPASS_AUTH } from '../../src/lib/preview';
import { colors } from '../../src/theme';

export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useSession();
  // While previewing there is nothing to sign in to, so the auth group would
  // otherwise trap the app here — the same bypass the tab and onboarding
  // layouts honour.
  if (PREVIEW_BYPASS_AUTH) return <Redirect href="/(tabs)" />;
  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect href="/(tabs)" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgDeep },
        animation: 'fade',
      }}
    />
  );
}
