const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

/**
 * Let our notification icon and colour win over react-native-firebase's.
 *
 * Two plugins declare the same Android meta-data. `expo-notifications` writes
 * the icon and colour from app.config; `@react-native-firebase/messaging`
 * ships its own defaults (`@color/white`) in the library manifest. The merger
 * refuses to choose and fails the release build:
 *
 *   Attribute meta-data#com.google.firebase.messaging.default_notification_color
 *   ... is also present at [:react-native-firebase_messaging] value=(@color/white)
 *
 * `tools:replace` says which declaration wins. Ours does — the library's is a
 * fallback for apps that never set one, and a white square is exactly the blob
 * the branded silhouette exists to avoid.
 *
 * Done as a plugin rather than by editing the manifest, because prebuild
 * regenerates that file and any hand edit is lost on the next run.
 */
const OWNED_BY_US = [
  'com.google.firebase.messaging.default_notification_color',
  'com.google.firebase.messaging.default_notification_icon',
  'com.google.firebase.messaging.default_notification_channel_id',
];

module.exports = function withFirebaseNotificationDefaults(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;

    // `tools:` has to be declared on the root element before it can be used.
    manifest.$ = {
      ...manifest.$,
      'xmlns:tools': 'http://schemas.android.com/tools',
    };

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(modConfig.modResults);
    for (const entry of application['meta-data'] ?? []) {
      if (OWNED_BY_US.includes(entry.$?.['android:name'])) {
        entry.$['tools:replace'] = 'android:resource';
      }
    }

    return modConfig;
  });
};
