import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { BottomTabBar } from '../components/AppNav';
import { AppShell } from './AppShell';
import AccountScreen from '../screens/account/AccountScreen';
import HomeScreen from '../screens/home/HomeScreen';
import LikedScreen from '../screens/liked/LikedScreen';
import MailboxScreen from '../screens/mailbox/MailboxScreen';
import ResourcesScreen from '../screens/resources/ResourcesScreen';
import type { TabParamList } from './types';

/**
 * Wraps a screen in the app chrome.
 *
 * A function per screen rather than one shared wrapper component: the tab
 * navigator remounts a screen whose component identity changes, so building
 * these inline would throw away the tab's state on every render.
 */
function withShell<P extends object>(Screen: React.ComponentType<P>) {
  return function Shelled(props: P) {
    return (
      <AppShell>
        <Screen {...props} />
      </AppShell>
    );
  };
}

const Home = withShell(HomeScreen);
const Mailbox = withShell(MailboxScreen);
const Liked = withShell(LikedScreen);
const Resources = withShell(ResourcesScreen);
const Account = withShell(AccountScreen);

const Tab = createBottomTabNavigator<TabParamList>();

/**
 * The five places the tab bar switches between.
 *
 * A real navigator with our own bar, rather than a bar that pushed routes: the
 * navigator keeps each tab's own state and scroll position, so returning to a
 * tab feels like coming back rather than starting again.
 *
 * Home and Mailbox are not lazy — they are where members go immediately, and
 * rendering them during the launch animation costs less than a blank frame on
 * the first tap. `freezeOnBlur` stops the other three re-rendering in the
 * background while you are not looking at them.
 */
export function BottomTab() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false, lazy: true, freezeOnBlur: true }}
      backBehavior="history"
    >
      <Tab.Screen name="Home" component={Home} options={{ lazy: false }} />
      <Tab.Screen name="Mailbox" component={Mailbox} options={{ lazy: false }} />
      <Tab.Screen name="Liked" component={Liked} />
      <Tab.Screen name="Resources" component={Resources} />
      <Tab.Screen name="Account" component={Account} />
    </Tab.Navigator>
  );
}
