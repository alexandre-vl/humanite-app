import type { ExpoConfig } from 'expo/config/index.js';

/**
 * Configuration of the application, read by Expo in Node, synchronously and without the context it passes: tools such
 * as knip load it with another context.
 */
const config: ExpoConfig = {
  name: 'Humanité',
  slug: 'humanite',
  scheme: 'humanite',
  version: '0.0.0',
  platforms: ['ios', 'android'],
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: { bundleIdentifier: 'dev.humanite.app' },
  android: {
    package: 'dev.humanite.app',
    // React Native 0.86 registers its back callback on API 36 devices only: the system back would close the app.
    predictiveBackGestureEnabled: false,
  },
  plugins: ['expo-router'],
  experiments: { typedRoutes: true, reactCompiler: true },
  updates: { enabled: false },
};

export default config;
