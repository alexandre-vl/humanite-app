import { CORPUS_SOURCE, SOURCE_VARIABLE } from '@huma/architecture';
import { jest } from '@jest/globals';
import type { ReactNode } from 'react';
import type { AccessibilityRole, StyleProp, ViewStyle } from 'react-native';

// The tests read the corpus: Jest resolves the content door's default module, never its service variant, whatever the
// shell that runs them has exported. The variable is made to say the same, since the door refuses a build whose source
// and variable disagree — a service chosen for a phone's build would otherwise stop every test at its first import.
// Expo reads the variable when a module asks for it, which is after this.
process.env[SOURCE_VARIABLE] = CORPUS_SOURCE;

// A frame never arrives without a screen, so the runner's requestAnimationFrame fires on a timer of its own, after the
// test that scheduled it has ended. @shopify/flash-list schedules the end of its first layout that way, and the state
// it then sets lands outside every act() scope — which React reports, on a file chosen by whichever test happened to be
// running. Calling back at once puts that state where the render that asked for it is, and the report has no cause
// left. Nothing in the app schedules a frame itself, so this stands in for the library alone.
globalThis.requestAnimationFrame = (callback: (time: number) => void): number => {
  callback(0);
  return 0;
};

// react-native-mmkv reaches its native NitroModules TurboModule at import, which no headless runner provides. The
// storage lib only calls getString/set/remove/trim, so an in-memory map stands in and lets the persister round-trip.
//
// `trim` does nothing here, and that is the whole truth of this double rather than a shortcut. On a phone MMKV keeps
// an append-only log, so a removed key's value stays in the file until the log is rewritten, and `trim` is what
// rewrites it; a map deletes what it deletes. Nothing offline can tell the two apart, which is why the erasure is
// proved on a device and recorded in ADR-0034 instead.
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
      trim: (): void => undefined,
    }),
  };
});

// expo-secure-store reaches the platform's keystore, which no headless runner has. An in-memory map stands in, with
// the same synchronous reads and writes and the same asynchronous delete — so the move across from the old store and
// the overwrite that precedes a delete are exercised here exactly as they run on a phone.
jest.mock('expo-secure-store', () => {
  const kept = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
    getItem: (key: string): string | null => kept.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      kept.set(key, value);
    },
    deleteItemAsync: async (key: string): Promise<void> => {
      kept.delete(key);
      return Promise.resolve();
    },
  };
});

// expo-splash-screen and expo-font reach native modules absent from a headless runner; the startup-gate test drives them.
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));

// expo-system-ui paints the window through a native module a headless runner lacks; the theme root calls it on every
// change of theme, and a test that mounts one would otherwise fail before rendering anything.
jest.mock('expo-system-ui', () => ({ setBackgroundColorAsync: jest.fn() }));

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
    useAnimatedStyle: (updater: () => unknown): unknown => updater(),
  };
});

// @shopify/flash-list reads its viewport and its cells through the native layer, which a headless runner answers with
// zeroes. Given no size it never builds a layout manager, so it neither virtualises nor recycles, and a list test would
// prove only that the items render. These three measures — the ones the library ships in its own jestSetup, and whose
// doc calls them "specific method for easier mocking" — give it a 400×900 window of 100 px cells.
jest.mock('@shopify/flash-list/dist/recyclerview/utils/measureLayout', () => {
  const viewport = { x: 0, y: 0, width: 400, height: 900 };
  const cell = { x: 0, y: 0, width: 100, height: 100 };
  const actual = jest.requireActual<Record<string, unknown>>(
    '@shopify/flash-list/dist/recyclerview/utils/measureLayout',
  );
  return {
    ...actual,
    measureParentSize: (): typeof viewport => viewport,
    measureFirstChildLayout: (): typeof viewport => viewport,
    measureItemLayout: (): typeof cell => cell,
  };
});

// expo-image and expo-symbols reach native modules a headless runner lacks; each renders a plain view so the image and
// icon primitives mount without touching the native layer. Both keep a name: a view with nothing on it cannot be told
// from any other view, and which mark a row carries — a picture at all, a chevron rather than a bookmark — is part of
// the tree each promises to mount. The symbol carries the platform name it was given rather than the key it was named
// by, because that is all it receives; a test reads the key through the registry, which stays the single source.
//
// Each carries through what it was told to announce exactly as far as the library it stands for does. expo-image takes
// the props and hands them to the native view, so its stand-in repeats them and a test can read what the real view
// carries. expo-symbols takes none: on Android its view is a box around a letter, and everything but the box's style
// is dropped on the way — so its stand-in drops them too. It repeated them once, and the bench agreed with an icon
// whose announcement never reached a phone: the play mark of every video card was read out as its glyph, U+E037.
type Announced = Readonly<{
  accessible?: boolean | undefined;
  accessibilityRole?: AccessibilityRole | undefined;
  accessibilityLabel?: string | undefined;
  accessibilityElementsHidden?: boolean | undefined;
  importantForAccessibility?: 'yes' | 'no-hide-descendants' | undefined;
}>;

const mockAnnounced = (props: Announced): Announced => ({
  accessible: props.accessible,
  accessibilityRole: props.accessibilityRole,
  accessibilityLabel: props.accessibilityLabel,
  accessibilityElementsHidden: props.accessibilityElementsHidden,
  importantForAccessibility: props.importantForAccessibility,
});

// The picture's stand-in carries the style it was handed, like the symbol's below and for the same reason: how a
// picture is laid out is a thing that can be wrong. It dropped it, and a bench that cannot read a picture's layout
// cannot report one — eight points of margin under a lead picture came off its height, and a box held to a ratio
// lost thirty-seven pixels of width with it, on a front page six green chains had just called clean.
jest.mock('expo-image', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  const reactNative = jest.requireActual<typeof import('react-native')>('react-native');
  const image = (props: Announced & { style?: StyleProp<ViewStyle> }): unknown =>
    react.createElement(reactNative.View, { testID: 'picture', style: props.style, ...mockAnnounced(props) });
  return { __esModule: true, Image: image };
});

// The symbol's stand-in also lays itself out the way the library does — a box of the size it was handed, then the
// style it was given — because on Android that size is a font size and the box is not, and the primitive undoes the
// reader's step on one of the two. A stand-in that dropped the size would let that come apart unseen. It reads the
// name, the size and the style, and nothing else, which is all the library's Android view reads.
jest.mock('expo-symbols', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  const reactNative = jest.requireActual<typeof import('react-native')>('react-native');
  const symbolView = (props: { name?: { android?: string }; size?: number; style?: StyleProp<ViewStyle> }): unknown =>
    react.createElement(reactNative.View, {
      testID: `symbol:${props.name?.android ?? ''}`,
      style: [{ width: props.size, height: props.size }, props.style],
    });
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
