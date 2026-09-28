import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ALERTS } from '#api';
import { STORAGE_KEYS, field, stateStorage } from '#lib/storage';

/**
 * The version of what this writes to disk: the first shape, named rather than described, and read back before
 * anything is restored (ADR-0036, R3).
 */
const VERSION = 1;

/** What the reader chose, and all that is written: whether they want the journal's alerts. */
type Choice = Readonly<{ wanted: boolean }>;

/**
 * Where the reader stands with the journal's alerts, as the screen that sets them shows it.
 *
 * `asking` is the platform's own question, up while it waits for an answer, so a second press does not ask it twice.
 * `blocked` is the platform's answer when it is no: the reader wants the alerts and the phone will not let the app
 * show one. It is read again whenever the screen asks, the reader being free to change it in the phone's settings, so
 * it is never written down.
 */
type Standing = Choice &
  Readonly<{
    asking: boolean;
    blocked: boolean;
    turnOn: () => Promise<void>;
    turnOff: () => void;
    check: () => Promise<void>;
  }>;

/** What the app does when nothing has been chosen: no alert, and nothing sent to anyone. */
const NOTHING_CHOSEN = { wanted: false } as const satisfies Choice;

/**
 * The choice a disk holds, as a choice: wanted only when the disk says exactly that, and not wanted otherwise. What
 * comes back is whatever a file on a phone holds, and alerts nobody asked for are the one mistake this cannot make.
 */
const choiceOf = (persisted: unknown): Choice => ({ wanted: field(persisted, 'wanted') === true });

/**
 * The reader's choice about the journal's alerts, and the three things the screen does about it.
 *
 * Only the choice is written; the rest is the platform's, asked again when it matters. Turning the alerts on is a
 * question to the platform first: the choice is kept as `wanted` only once the phone lets the app notify, so what the
 * disk holds is never a subscription the reader could not receive.
 */
export const useAlerts = create<Standing>()(
  persist(
    (set, get) => ({
      ...NOTHING_CHOSEN,
      asking: false,
      blocked: false,
      turnOn: async (): Promise<void> => {
        if (get().asking) {
          return;
        }
        set({ asking: true });
        try {
          const granted = await ALERTS.subscribe();
          set({ wanted: granted, blocked: !granted });
        } catch {
          // OneSignal could not be started: the alerts stay off, which is what the switch goes back to showing.
          set({ wanted: false, blocked: false });
        } finally {
          set({ asking: false });
        }
      },
      turnOff: (): void => {
        set({ wanted: false, blocked: false });
        ALERTS.unsubscribe().catch(() => undefined);
      },
      // Read again only where it can have changed: a phone that notifies for a reader who wants the alerts, or one
      // that refused a reader who asked. Nothing is asked of a platform the reader has not asked anything of.
      check: async (): Promise<void> => {
        if (!get().wanted && !get().blocked) {
          return;
        }
        try {
          set({ blocked: !(await ALERTS.permitted()) });
        } catch {
          // OneSignal could not be started, which nothing in the phone's settings mends: the refusal stays as it was.
        }
      },
    }),
    {
      name: STORAGE_KEYS.alerts,
      version: VERSION,
      storage: createJSONStorage(() => stateStorage(STORAGE_KEYS.alerts)),
      partialize: (standing): Choice => ({ wanted: standing.wanted }),
      merge: (persisted, current) => ({ ...current, ...choiceOf(persisted) }),
    },
  ),
);

/**
 * Starts the alerts again at a start of the app, for a reader who had turned them on.
 *
 * OneSignal is started by the reader and by nothing else, so a process that begins with the alerts wanted has to
 * start it itself: until it does, the subscription the journal holds for this phone is not kept alive, and a touch on
 * an alert that opened the app goes unheard.
 */
export const resumeAlerts = (): void => {
  if (useAlerts.getState().wanted) {
    ALERTS.resume();
  }
};
