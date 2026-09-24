import type { ExpoConfig } from 'expo/config/index.js';

/**
 * Configuration of the application, read by Expo in Node, synchronously and without the context it passes: tools such
 * as knip load it with another context.
 */
const config: ExpoConfig = {
  // The name the phone prints under the icon, and the one the paper is called: the store lists it as
  // « L'Humanité - Le Journal », published by la Société Nouvelle du Journal l'Humanité. The article is part of the
  // name and the launcher had been dropping it.
  name: 'L’Humanité',
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
    // Android's automatic backup copies the app's own directory to the reader's Drive and restores it onto whatever
    // phone they next sign into. The store in that directory holds what the paper answered; the keystore holding the
    // subscriber's token does not travel, and is asked not to (ADR-0034). Letting the backup run would carry the one
    // half to a device the other half was refused, and carry it through a service neither the journal nor the reader
    // is party to.
    //
    // It costs something, and the cost is the kept articles. Measured on a capture of the journal's own app on
    // 24/09/2026: opening its favourites made no call to the service at all, and nothing the service answers carries
    // a list — `/skin` styles the toggle, `/json_parameters` says the feature exists, and that is the whole of it.
    // Both apps keep that list on the phone and nowhere else, so a reader changing phone starts their shelf again.
    // Paying it here is the narrow reading: one file holds both the shelf and the bodies a subscription paid for, and
    // until those are two files there is no way to send one without the other.
    allowBackup: false,
  },
  plugins: ['expo-router'],
  experiments: { typedRoutes: true, reactCompiler: true },
  updates: { enabled: false },
};

export default config;
