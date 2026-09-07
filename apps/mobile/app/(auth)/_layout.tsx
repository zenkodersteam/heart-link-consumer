import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Stack } from 'expo-router';

import { colors } from '../../src/theme';

export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useAuth();
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
