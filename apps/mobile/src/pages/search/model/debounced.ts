import { useEffect, useState } from 'react';

/**
 * How long, in milliseconds, the screen lets a reader keep typing before what is in the field becomes a question. It
 * is not a token: nothing else in the app waits on a reader, and a design that changed it would not be changing a
 * duration the rest of the journal shares.
 */
export const SETTLE = 300;

/** What no value is: waited on, every one of them. */
const never = (): boolean => false;

/**
 * A value as it stands once the reader has stopped changing it — or at once, for a value `now` says is not waited on.
 *
 * Without this, every keystroke is its own question, and a question is a key in a cache: typing one word files each
 * of its prefixes, asks the content for each of them, and throws all but the last away. Waiting for the typing to
 * settle asks once for what was meant.
 *
 * What is taken at once replaces what had settled before it, for good. A search takes an emptied line at once: waited
 * on, the line emptied left the last answer standing under it — and a line emptied and typed into again before the
 * wait was out answered the new question with the old one's answer until the typing stopped.
 */
export function useDebounced(value: string, now: (value: string) => boolean = never): string {
  const [settled, setSettled] = useState(value);
  // Adjusted while rendering rather than in an effect, which is what React asks of state that follows a prop: the
  // render that finds the value not waited on draws it, and not the one before.
  if (value !== settled && now(value)) {
    setSettled(value);
  }
  useEffect(() => {
    // Nothing is waited on when nothing has changed — the first render included, where a wait would only ever end by
    // setting the value it already holds, well after the screen had stopped caring.
    if (value === settled) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setSettled(value);
    }, SETTLE);
    return () => {
      clearTimeout(timer);
    };
  }, [value, settled]);
  return settled;
}
