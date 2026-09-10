import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useRef, type ComponentType } from 'react';
import { Platform } from 'react-native';

import { isOnboarded, useMyProfile } from '../lib/use-my-profile';
import { useSession } from '../lib/session';
import BlockedScreen from '../screens/account/BlockedScreen';
import ChangePasswordScreen from '../screens/account/ChangePasswordScreen';
import EditProfileScreen from '../screens/account/EditProfileScreen';
import CircleScreen from '../screens/support/CircleScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import PlansScreen from '../screens/account/PlansScreen';
import PolicyScreen from '../screens/legal/PolicyScreen';
import PrivacySafetyScreen from '../screens/legal/PrivacySafetyScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import SponsorScreen from '../screens/support/SponsorScreen';
import SupportScreen from '../screens/support/SupportScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import { BottomTab } from './BottomTab';
import { withSafeTop } from './PushedScreen';
import { navigationRef } from './navigationRef';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Pushed screens that start with a header carry their own status-bar inset:
// there is no AppShell above them to hold it, and without it the header sat
// under the clock. Profile is not one of them — its photo is meant to run to
// the top of the screen, and it insets its own floating controls.
const EditProfile = withSafeTop(EditProfileScreen);
const ChangePassword = withSafeTop(ChangePasswordScreen);
const Blocked = withSafeTop(BlockedScreen);

// The sheets need the same thing, but only where they are drawn full-screen.
// An iOS page sheet already starts below the status bar, so adding the inset
// there would just be a band of empty space at the top of every one.
const asSheet = <P extends object>(screen: ComponentType<P>) =>
  Platform.OS === 'ios' ? screen : withSafeTop(screen);
const Plans = asSheet(PlansScreen);
const Sponsor = asSheet(SponsorScreen);
const Support = asSheet(SupportScreen);
const Circle = asSheet(CircleScreen);
const PrivacySafety = asSheet(PrivacySafetyScreen);
const Policy = asSheet(PolicyScreen);

/**
 * The presentation for screens that are consulted rather than travelled to.
 *
 * iOS gets a real card sheet - the inset, the parallax on the screen behind,
 * and the drag-to-dismiss that comes with it. Android has no equivalent
 * material, so it keeps a push and simply enters from the bottom, which is the
 * closest thing its own apps do.
 */
const SHEET = Platform.select({
  ios: { presentation: 'modal', animation: 'slide_from_bottom' },
  default: { animation: 'slide_from_bottom' },
}) as { presentation?: 'modal'; animation: 'slide_from_bottom' };

/**
 * Every screen, and the three states an account can be in.
 *
 * Where someone belongs is decided once, here, rather than by each screen
 * redirecting: signed out goes to Welcome, signed in with an unfinished
 * profile goes to Onboarding, and everyone else goes to the app. Gates spread
 * across three layouts were how a member could watch the app appear and then
 * be thrown out of it.
 *
 * The stack is rebuilt — not navigated — when that answer changes, so nothing
 * from a previous session is left underneath to swipe back to.
 */
export function RootStack() {
  const { isSignedIn, isLoaded } = useSession();
  const { profile, loading: profileLoading, error: profileError } = useMyProfile();

  // Fail open on a profile we could not load: a network blip is not evidence
  // that onboarding is unfinished, and treating it as such locks people out of
  // an app they have already set up.
  const needsOnboarding = isSignedIn && !profileError && !profileLoading && !isOnboarded(profile);

  const destination: keyof RootStackParamList = !isSignedIn
    ? 'Welcome'
    : needsOnboarding
      ? 'Onboarding'
      : 'Tabs';

  // Sign-out, and finishing onboarding, both change which stack should exist.
  // Resetting rather than navigating leaves no history back into the old one.
  const previous = useRef(destination);
  useEffect(() => {
    if (previous.current === destination) return;
    previous.current = destination;
    if (!navigationRef.isReady()) return;
    navigationRef.reset({ index: 0, routes: [{ name: destination }] });
  }, [destination]);

  // Nothing is drawn until the stored session has been read, so the app cannot
  // show a signed-out screen to somebody who is signed in.
  if (!isLoaded) return null;

  return (
    <Stack.Navigator
      initialRouteName={destination}
      screenOptions={{
        headerShown: false,
        // The platform's own gestures, everywhere. This is the whole reason
        // for a stack: swipe back on iOS, hardware back on Android.
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      {/* No swiping out of onboarding: leaving it half-done is what the flow
          exists to prevent, and its own steps handle going back. */}
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ gestureEnabled: false, animation: 'fade' }}
      />

      <Stack.Screen name="Tabs" component={BottomTab} options={{ animation: 'fade' }} />

      {/* Places you go forward to: a profile, your own profile, the people you
          have blocked. These push. */}
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfile} />
      <Stack.Screen name="ChangePassword" component={ChangePassword} />
      <Stack.Screen name="Blocked" component={Blocked} />

      {/* Things you bring up and dismiss, rather than travel to. A sheet says
          that in the way it arrives, and gives back the drag-down that people
          were already trying on them. */}
      <Stack.Group screenOptions={SHEET}>
        <Stack.Screen name="Plans" component={Plans} />
        <Stack.Screen name="Sponsor" component={Sponsor} />
        <Stack.Screen name="Support" component={Support} />
        <Stack.Screen name="Circle" component={Circle} />
        <Stack.Screen name="PrivacySafety" component={PrivacySafety} />
        <Stack.Screen name="Policy" component={Policy} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
