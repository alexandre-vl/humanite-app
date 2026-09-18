import { jest } from '@jest/globals';
import type { ReactNode } from 'react';

// react-native-mmkv reaches its native NitroModules TurboModule at import, which no headless runner provides. The
// storage lib only calls getString/set/remove, so an in-memory map stands in and lets the persister round-trip.
jest.mock('react-native-mmkv', () => {
  const store = new Map<string, string>();
  return {
    createMMKV: () => ({
      getString: (key: string): string | undefined => store.get(key),
      set: (key: string, value: string): void => {
        store.set(key, value);
      },
      remove: (key: string): void => {
        store.delete(key);
      },
    }),
  };
});

// expo-splash-screen and expo-font reach native modules absent from a headless runner; the startup-gate test drives them.
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));

// react-native-reanimated (and its own mock) eagerly loads the worklets native module a headless runner lacks. This stand-in
// gives Animated views the plain react-native ones, a shared value backed by a closure, and an animated style that runs its
// updater once — enough for the collapsible header to render and its geometry to be exercised on the JS thread.
jest.mock('react-native-reanimated', () => {
  const reactNative = jest.requireActual<typeof import('react-native')>('react-native');
  const useSharedValue = (initial: number): { get: () => number; set: (next: number) => void } => {
    let current = initial;
    return {
      get: (): number => current,
      set: (next: number): void => {
        current = next;
      },
    };
  };
  return {
    __esModule: true,
    default: reactNative,
    useSharedValue,
    useAnimatedScrollHandler: () => jest.fn(),
    useAnimatedStyle: (updater: () => unknown): unknown => updater(),
  };
});

// expo-image and expo-symbols reach native modules a headless runner lacks; each renders a plain view so the image and
// icon primitives mount without touching the native layer.
jest.mock('expo-image', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  const reactNative = jest.requireActual<typeof import('react-native')>('react-native');
  const image = (): unknown => react.createElement(reactNative.View, null);
  return { __esModule: true, Image: image };
});

jest.mock('expo-symbols', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  const reactNative = jest.requireActual<typeof import('react-native')>('react-native');
  const symbolView = (): unknown => react.createElement(reactNative.View, null);
  return { __esModule: true, SymbolView: symbolView };
});

// react-native-safe-area-context measures native insets a headless runner lacks; a passthrough provider and zero insets
// let the safe-area primitive and the collapsible header render without a device.
jest.mock('react-native-safe-area-context', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  const reactNative = jest.requireActual<typeof import('react-native')>('react-native');
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };
  const safeAreaProvider = ({ children }: { children: ReactNode }): unknown =>
    react.createElement(reactNative.View, null, children);
  return {
    __esModule: true,
    SafeAreaProvider: safeAreaProvider,
    useSafeAreaInsets: (): typeof insets => insets,
  };
});
