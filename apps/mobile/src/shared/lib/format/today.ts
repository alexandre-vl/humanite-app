import type { IssueId } from '@huma/contracts';
import { instantOf, issueIdAt } from '@huma/contracts';
import { useSyncExternalStore } from 'react';
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
