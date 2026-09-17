import { jest } from '@jest/globals';

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
