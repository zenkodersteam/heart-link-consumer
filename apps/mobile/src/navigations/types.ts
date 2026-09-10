import type { NavigatorScreenParams, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/**
 * Every screen in the app, and what it needs to be opened with.
 *
 * One list, so a typo in a destination is a compile error rather than a screen
 * that silently does nothing — which is what a string path buys you.
 */
export type RootStackParamList = {
  Welcome: undefined;
  /** `intent` decides the wording: signing in and signing up are one screen. */
  SignIn: { intent?: 'sign_in' | 'sign_up' } | undefined;
  Onboarding: { section?: string } | undefined;

  /**
   * The tab bar and the five screens it switches between.
   *
   * `NavigatorScreenParams` is what lets a caller say which tab, and open it
   * on something — `navigate('Tabs', { screen: 'Mailbox', params: { thread } })`
   * — with the inner params type-checked against `TabParamList`.
   */
  Tabs: NavigatorScreenParams<TabParamList> | undefined;

  Profile: { id: string };
  EditProfile: undefined;
  ChangePassword: undefined;
  Plans: { checkout?: 'success' | 'cancel' } | undefined;
  Sponsor: { profile?: string; checkout?: 'success' | 'cancel' } | undefined;
  Support: undefined;
  Circle: undefined;
  Blocked: undefined;
  PrivacySafety: undefined;
  Policy: { doc?: 'terms' | 'privacy' } | undefined;
};

export type TabParamList = {
  Home: undefined;
  /** A thread or a compose target can be opened straight from a notification. */
  Mailbox: { thread?: string; compose?: string; name?: string; purchase?: string } | undefined;
  Liked: undefined;
  Resources: undefined;
  Account: { checkout?: 'success' | 'cancel' } | undefined;
};

export type RootNavigation<Route extends keyof RootStackParamList = keyof RootStackParamList> =
  NativeStackNavigationProp<RootStackParamList, Route>;

export type RootRoute<Route extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  Route
>;

export type RootScreenProps<Route extends keyof RootStackParamList> = {
  navigation: RootNavigation<Route>;
  route: RootRoute<Route>;
};

/**
 * Screens inside the tab navigator can still reach the root stack, so their
 * navigation prop is typed as both.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}

/** A tab screen's route, for reading the params it was opened with. */
export type TabRoute<Route extends keyof TabParamList> = RouteProp<TabParamList, Route>;
