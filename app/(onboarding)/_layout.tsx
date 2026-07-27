import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Slot } from 'expo-router';

import { PREVIEW_BYPASS_AUTH } from '../../src/lib/preview';

export default function OnboardingLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn && !PREVIEW_BYPASS_AUTH) return <Redirect href="/" />;
  return <Slot />;
}
