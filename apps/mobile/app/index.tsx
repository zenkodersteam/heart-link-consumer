import { useSession } from '../src/lib/session';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Landing } from '../src/components/Landing';
import { colors } from '../src/theme';
export default function Index() {
  const { isSignedIn, isLoaded } = useSession();
  // Signed-in users go straight to the app; everyone else lands on the
  // marketing site, whose CTAs route to the real /(auth) sign-in / sign-up.
  //
  // Do not show the public marketing page while a stored session is being restored for an existing
  // session. On refresh, signed-in users were seeing the home page flash before
  // the app shell returned, which felt cheap. Hold a branded boot surface until
  // auth resolves, then route once.
  if (!isLoaded) return <BootSurface />;
  if (isLoaded && isSignedIn) return <Redirect href="/(tabs)" />;
  return <Landing />;
}

function BootSurface() {
  return (
    <View style={styles.boot}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgDeep },
});
