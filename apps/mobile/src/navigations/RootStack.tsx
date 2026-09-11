import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';

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
import { ResourceCategoryScreen } from '../screens/resources/ResourcesScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import SponsorScreen from '../screens/support/SponsorScreen';
import SupportScreen from '../screens/support/SupportScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import { BottomTab } from './BottomTab';
import { withBackHeader, withSafeTop } from './PushedScreen';
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
const ResourceCategory = withSafeTop(ResourceCategoryScreen);

// Formerly sheets. They push now, like every other screen: an iOS page sheet
// is dismissed by dragging it down, and the swipe in from the left edge that
// works everywhere else in the app did nothing on them. Those without a header
// of their own are given the standard one, since a pushed screen needs a way
// out that a sheet did not.
const Plans = withSafeTop(PlansScreen);
const Sponsor = withBackHeader(SponsorScreen, 'Sponsor a member');
const Support = withBackHeader(SupportScreen, 'Support');
const Circle = withBackHeader(CircleScreen, 'Support Circle');
const PrivacySafety = withSafeTop(PrivacySafetyScreen);
const Policy = withSafeTop(PolicyScreen);

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
      <Stack.Screen name="ResourceCategory" component={ResourceCategory} />

      {/* Plans, support and the policies: pushed like the rest, so the
          edge swipe works on them too. */}
      <Stack.Screen name="Plans" component={Plans} />
      <Stack.Screen name="Sponsor" component={Sponsor} />
      <Stack.Screen name="Support" component={Support} />
      <Stack.Screen name="Circle" component={Circle} />
      <Stack.Screen name="PrivacySafety" component={PrivacySafety} />
      <Stack.Screen name="Policy" component={Policy} />
    </Stack.Navigator>
  );
}
