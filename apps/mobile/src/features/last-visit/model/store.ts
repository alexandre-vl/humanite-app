import type { Instant } from '@huma/contracts';
import { INSTANT } from '@huma/contracts';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS, field, stateStorage } from '#lib/storage';

/**
 * The version of what this writes to disk: the newest item the wire showed. It names the first shape, and is read back
 * before anything is restored, so the day the shape moves, what was written under this number is brought forward or
 * dropped rather than read as though it had always meant the same thing.
 */
const VERSION = 1;

/**
 * How long the app has to have been put away for its next opening to be another visit: half an hour.
 *
 * A reader who leaves to answer a message and comes back a minute later is still reading, and the line they were
 * shown should still be where it was; a reader who comes back after lunch is on another visit, and the line moves
 * down to what they have not seen. Half an hour is where the web has drawn that line for twenty years — a session of
 * Google Analytics ends after thirty minutes of nothing.
 */
export const VISIT_GAP = 30 * 60 * 1000;

type Visits = Readonly<{
  /** The newest item En continu has shown the reader, on this visit or an earlier one. Written to disk. */
  seen: Instant | null;
  /** What `seen` was when this visit began: the line this visit draws on the wire. Never written. */
  since: Instant | null;
  /** When the app was last put away, until it comes back. */
  leftAt: number | null;
  /** The wire, on screen, shows `newest` at its top. */
  saw: (newest: Instant) => void;
  /** The app is put away, at `at`. */
  left: (at: number) => void;
  /** The app comes back, at `at`: another visit, if it was away long enough. */
  came: (at: number) => void;
}>;

/**
 * The instant a disk holds as the newest item seen, or nothing when it holds none.
 *
 * What comes back is a string the app wrote and anything at all could have replaced, so it is read through the
 * contract's own parser; anything else leaves the reader on a first visit, which draws no line rather than a wrong one.
 */
const seenOf = (persisted: unknown): Instant | null => {
  const read = INSTANT.safeParse(field(persisted, 'seen'));
  return read.success ? read.data : null;
};

/**
 * The reader's visits to En continu: what the wire showed them last, and what it had shown them when this visit
 * began.
 *
 * A visit is the app's time on the screen, not the screen's: opening an article from the wire and coming back to it
 * is still the same visit, and the line stays where it was. The line is read at the start of the visit and kept for
 * all of it, so the items that arrive while the reader is there are above it with the rest of what is new.
 */
export const useVisits = create<Visits>()(
  persist(
    (set) => ({
      seen: null,
      since: null,
      leftAt: null,
      saw: (newest: Instant): void => {
        set((state) => (state.seen !== null && state.seen >= newest ? state : { seen: newest }));
      },
      left: (at: number): void => {
        set({ leftAt: at });
      },
      came: (at: number): void => {
        set((state) =>
          state.leftAt !== null && at - state.leftAt >= VISIT_GAP
            ? { since: state.seen, leftAt: null }
            : { leftAt: null },
        );
      },
    }),
    {
      name: STORAGE_KEYS.wireVisit,
      version: VERSION,
      storage: createJSONStorage(() => stateStorage(STORAGE_KEYS.wireVisit)),
      partialize: (state) => ({ seen: state.seen }),
      // The app starts a visit when it starts: the line of this one is what the last one saw.
      merge: (persisted, current) => {
        const seen = seenOf(persisted);
        return { ...current, seen, since: seen };
      },
    },
  ),
);

/**
 * The newest item the wire had shown at the reader's last visit, while noting what it shows at this one.
 *
 * The wire is only seen while it is `shown`, which the screen says: a tab keeps its screen mounted once opened, and a
 * wire refreshed behind another tab would otherwise count as read items nobody saw. What the app does when it is put
 * away and brought back is heard here too, which is enough: a visit that never opened the wire saw nothing of it and
 * moved nothing.
 */
export const useLastVisit = (newest: Instant | null, shown: boolean): Instant | null => {
  const since = useVisits((state) => state.since);
  const saw = useVisits((state) => state.saw);
  const left = useVisits((state) => state.left);
  const came = useVisits((state) => state.came);
  useEffect(() => {
    if (shown && newest !== null) {
      saw(newest);
    }
  }, [shown, newest, saw]);
  useEffect(() => {
    const watching = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        came(Date.now());
      } else if (state === 'background') {
        left(Date.now());
      }
    });
    return () => {
      watching.remove();
    };
  }, [came, left]);
  return since;
};
