import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'HeartLink',
  slug: 'heartlink',
  version: '0.0.1',
  orientation: 'portrait',
  scheme: 'heartlink',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.heartlink.app',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#FBF1EB',
    },
    package: 'com.heartlink.app',
  },
  web: {
    bundler: 'metro',
    output: 'single',
  },
  plugins: ['expo-router'],
});
