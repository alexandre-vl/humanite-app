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
