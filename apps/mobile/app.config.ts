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
  // The paper's own mark, as the journal draws it: a red square with the H of its masthead in white. It is taken from
  // the app the journal publishes (6.2.0) rather than drawn again, because it is theirs and because a second drawing
  // of a mark is a mark that drifts. The red is the palette's `uiRed` to the digit, which is where the palette got it.
  //
  // Android 12 and after paint a mark on the field they show before an app has run, and paint the launcher's when an
  // app declares none. Declaring none left Expo's placeholder there — a grid of grey circles — on the launcher and on
  // that field alike.
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: { bundleIdentifier: 'dev.humanite.app' },
  android: {
    package: 'dev.humanite.app',
    // The mark again, as the two pieces Android asks for since Oreo: the foreground it masks to whatever shape the
    // launcher uses, and the ground behind it. The foreground already carries the red square, so the ground is only
    // seen where the mask cuts past its corners, and it is the same red.
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#f13c47' },
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
  plugins: [
    'expo-router',
    // The field the phone paints before a line of this app has run, and the one it paints behind the app after.
    //
    // The ground is the paper's — white, or the measured #141414 under a dark system — and the mark on it is the
    // paper's own, which Android masks to a circle at the middle of the field. The masthead is not put here: it is
    // set in a face the app loads, a picture of it would be a second drawing of the same words, and Android's mask
    // would cut a wordmark in half. The app lays it on the same ground as soon as the faces are in, so nothing
    // flashes between the phone's field and the app's.
    //
    // The image is declared and not left out. Left out, the plugin writes no drawable and still points the theme at
    // one: `styles.xml` named `@drawable/splashscreen_logo` in a tree that had no such file, which is a build that
    // cannot link. Given no plugin at all, Expo puts its own placeholder there instead.
    //
    // The values are the palette's `white` and `darkBackground`, written out because a config is read by Node,
    // before anything of the app is built, and cannot import a token.
    [
      'expo-splash-screen',
      { image: './assets/splash-icon.png', backgroundColor: '#ffffff', dark: { backgroundColor: '#141414' } },
    ],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  updates: { enabled: false },
};

export default config;
