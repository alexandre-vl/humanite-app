import type { Instant } from '@huma/contracts';
import { INSTANT } from '@huma/contracts';
import { useCallback, useEffect, useState } from 'react';
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

type Visits = Readonly<{
  /** The newest item En continu has shown the reader, the last time they looked or any time before. Written to disk. */
  seen: Instant | null;
  /** The wire, on screen, shows `newest` at its top. */
  saw: (newest: Instant) => void;
}>;

/**
 * The instant a disk holds as the newest item seen, or nothing when it holds none.
 *
 * What comes back is a string the app wrote and anything at all could have replaced, so it is read through the
 * contract's own parser; anything else leaves the reader on a first visit, which marks nothing new rather than the
 * wrong items.
 */
const seenOf = (persisted: unknown): Instant | null => {
  const read = INSTANT.safeParse(field(persisted, 'seen'));
  return read.success ? read.data : null;
};

/**
 * What En continu has shown the reader: the newest item it had at its top while it was in front of them.
 *
 * Only that is kept, and on disk, because only that outlives a look at the wire; what a look marks as new is worked
 * out from it by the one screen that looks, and is gone when the reader looks away.
 */
export const useVisits = create<Visits>()(
  persist(
    (set) => ({
      seen: null,
      saw: (newest: Instant): void => {
        set((state) => (state.seen !== null && state.seen >= newest ? state : { seen: newest }));
      },
    }),
    {
      name: STORAGE_KEYS.wireVisit,
      version: VERSION,
      storage: createJSONStorage(() => stateStorage(STORAGE_KEYS.wireVisit)),
      partialize: (state) => ({ seen: state.seen }),
      merge: (persisted, current) => ({ ...current, seen: seenOf(persisted) }),
    },
  ),
);

/** What the wire is told of the reader's looks at it: what is new to them, and how to look at it afresh. */
export type LastVisit = Readonly<{
  /** The newest item the wire had shown when the reader last looked: every item filed after it is new to them. */
  since: Instant | null;
  /** Looking at the wire afresh while on it, which is what pulling it down for more is. */
  lookAgain: () => void;
}>;

/** A look at the wire: whether it is in front of the reader, and what it had shown them when they last looked. */
type Look = Readonly<{ shown: boolean; since: Instant | null }>;

/**
 * What is new to the reader on the wire, while noting what the wire shows them.
 *
 * New is new since the reader last looked, and they look again whenever they come back to the wire — from another
 * tab, from an article, from another app — and whenever they pull it down for more. The line this replaced held for a
 * whole visit, the app's time in front of the reader with half an hour away to make another, and it stayed where it
 * was after the reader turned to another tab and back, pulled the wire down, left and came back (25/09/2026): what
 * they had just read past was still being called new. It now lasts as long as the reader stays, which is the time it
 * takes to read what it marks, and what arrives while they are there is new with the rest.
 *
 * The wire is only seen while it is `shown`, which the screen says: a tab keeps its screen mounted once opened, and a
 * wire refreshed behind another tab would otherwise count as read items nobody saw. Coming back to the app counts
 * once it was put away, not when a call or the notification centre only covered it for a moment.
 */
export const useLastVisit = (newest: Instant | null, shown: boolean): LastVisit => {
  const seen = useVisits((state) => state.seen);
  const saw = useVisits((state) => state.saw);
  const [look, setLook] = useState<Look>(() => ({ shown, since: seen }));
  // Coming to the wire is read while rendering, where `seen` is still what the wire had shown before it came back
  // into view: the effect below writes down what it shows now, and a look taken after it would find nothing new. An
  // effect for the look would also be taken twice where React mounts a screen twice to test it, the second time after
  // the first had been written down.
  if (look.shown !== shown) {
    setLook({ shown, since: shown ? seen : look.since });
  }
  const lookAgain = useCallback((): void => {
    const shownLast = useVisits.getState().seen;
    setLook((current) => ({ ...current, since: shownLast }));
  }, []);
  useEffect(() => {
    if (shown && newest !== null) {
      saw(newest);
    }
  }, [shown, newest, saw]);
  // Listened to whether the wire is in front of the reader or not: behind another tab, what a look takes is taken
  // again when they turn to it.
  useEffect(() => {
    let away = false;
    const watching = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        away = true;
      } else if (state === 'active' && away) {
        away = false;
        lookAgain();
      }
    });
    return () => {
      watching.remove();
    };
  }, [lookAgain]);
  return { since: look.since, lookAgain };
};
