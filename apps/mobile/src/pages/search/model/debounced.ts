import { useEffect, useState } from 'react';

/**
 * How long, in milliseconds, the screen lets a reader keep typing before what is in the field becomes a question. It
 * is not a token: nothing else in the app waits on a reader, and a design that changed it would not be changing a
 * duration the rest of the journal shares.
 */
export const SETTLE = 300;

/**
 * A value as it stands once the reader has stopped changing it.
 *
 * Without this, every keystroke is its own question, and a question is a key in a cache: typing one word files each
 * of its prefixes, asks the content for each of them, and throws all but the last away. Waiting for the typing to
 * settle asks once for what was meant.
 */
export function useDebounced(value: string): string {
  const [settled, setSettled] = useState(value);
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
