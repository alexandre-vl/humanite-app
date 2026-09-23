import type { FaceSet, TextScale, ThemeChoice } from '@huma/design-tokens';
import { FACE_SETS, TEXT_SCALES, THEME_CHOICES } from '@huma/design-tokens';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS, field, stateStorage } from '#lib/storage';
import { PAPER_TYPESETTING } from '#lib/styles';

/**
 * The version of what this writes to disk. It names the first shape rather than describing a change, and is read back
 * before anything is restored, so the day the shape moves, what was written under this number is either brought
 * forward or dropped, never read as though it had always meant the same thing.
 *
 * A setting added later does not move the shape: a reader that answers with the paper's own value for a name the disk
 * does not hold already reads an older file correctly.
 */
const VERSION = 1;

/** What the reader has set about how the paper is printed for them. */
type Settings = Readonly<{ theme: ThemeChoice; scale: TextScale; faces: FaceSet }>;

/** What the paper does when nothing has been set: the phone's colours, and the type as the paper sets it. */
const DEFAULTS = { theme: 'system', ...PAPER_TYPESETTING } as const satisfies Settings;

type Reading = Settings &
  Readonly<{
    chooseTheme: (theme: ThemeChoice) => void;
    chooseScale: (scale: TextScale) => void;
    chooseFaces: (faces: FaceSet) => void;
    reset: () => void;
  }>;

/** The one of `allowed` a disk holds, or the paper's own value when it holds anything else. */
const oneOf = <Value extends string>(allowed: readonly Value[], held: unknown, fallback: Value): Value =>
  allowed.find((each): boolean => each === held) ?? fallback;

/**
 * The settings a disk holds, as settings.
 *
 * What comes back is a string the app wrote and anything at all could have replaced: a file on a phone is not a value
 * the type system has ever seen. Each name is therefore read against the closed list of what it may be, and anything
 * else is left behind for the paper's own value — so nothing downstream ever paints in a theme that does not exist or
 * sets type at a step that was never measured. These lists are the same the controls offer, named once in the tokens.
 */
const settingsOf = (persisted: unknown): Settings => ({
  theme: oneOf(THEME_CHOICES, field(persisted, 'theme'), DEFAULTS.theme),
  scale: oneOf(TEXT_SCALES, field(persisted, 'scale'), DEFAULTS.scale),
  faces: oneOf(FACE_SETS, field(persisted, 'faces'), DEFAULTS.faces),
});

/**
 * How the reader has asked for the paper to be printed.
 *
 * Only the settings are written; the actions are rebuilt at each start, a function being nothing a disk can hold. The
 * store is read synchronously at the first frame, the disk it is kept on answering without waiting, so the app never
 * paints in one theme and then another.
 */
export const usePreferences = create<Reading>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      chooseTheme: (theme: ThemeChoice): void => {
        set({ theme });
      },
      chooseScale: (scale: TextScale): void => {
        set({ scale });
      },
      chooseFaces: (faces: FaceSet): void => {
        set({ faces });
      },
      reset: (): void => {
        set(DEFAULTS);
      },
    }),
    {
      name: STORAGE_KEYS.preferences,
      version: VERSION,
      storage: createJSONStorage(() => stateStorage(STORAGE_KEYS.preferences)),
      // Typed, because it is the third place the shape of a setting is written and the only one the compiler was not
      // holding to it: a setting added to `Settings` breaks `DEFAULTS` and `settingsOf` at once, and used to leave
      // this one compiling — which would have written everything but the new one, and reset it on every cold start.
      partialize: (reading): Settings => ({ theme: reading.theme, scale: reading.scale, faces: reading.faces }),
      merge: (persisted, current) => ({ ...current, ...settingsOf(persisted) }),
    },
  ),
);
