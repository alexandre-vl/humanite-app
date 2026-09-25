import type { IssueId } from '@huma/contracts';
import { instantOf, issueIdAt } from '@huma/contracts';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

/** The day it is on the newsroom's clock, read off the phone's own. */
const readToday = (): IssueId => issueIdAt(instantOf(Date.now()));

/** Told whenever the app comes back in front of the reader, which is when a day can have passed without a screen. */
const followTheDay = (changed: () => void): (() => void) => {
  const subscription = AppState.addEventListener('change', changed);
  return () => {
    subscription.remove();
  };
};

/**
 * The day the reader is reading on, which a card's date is written against: an item of that day prints its hour, one
 * of the day before prints `Hier`.
 *
 * It is read again whenever a screen draws, and whenever the app comes back in front: a paper left open overnight and
 * brought back in the morning would otherwise go on printing last night's pieces at their bare hour, as if of today.
 * The day is a key and not an instant, so a screen drawn twice in a day is handed the same value twice and draws
 * nothing again for it.
 */
export const useToday = (): IssueId => useSyncExternalStore(followTheDay, readToday);

/** How often a screen printing ages asks the clock again, in milliseconds: once a minute, which is its own unit. */
const TICK = 60_000;

/**
 * The moment it is now, asked again every minute and again whenever the app comes back in front of the reader.
 *
 * It exists so that `Il y a 7\u00A0minutes` does not stay true only for the frame it was drawn on. The objection to
 * printing an age at all was exactly that — an age is right when it is written and wrong an hour later in a list left
 * open — and a clock is the answer to it rather than a reason to print something less useful.
 *
 * A minute, because a minute is the smallest thing any of these lines says. Redrawing faster would change no word on
 * the screen. The screens that read this are lists, so a tick costs the rows a reader can see and not the hundred
 * under them.
 */
export const useNow = (): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const beat = setInterval(() => {
      setNow(Date.now());
    }, TICK);
    const back = AppState.addEventListener('change', () => {
      setNow(Date.now());
    });
    return () => {
      clearInterval(beat);
      back.remove();
    };
  }, []);
  return now;
};
