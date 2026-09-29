import { useEffect } from 'react';
import { READER } from '#api';
import { listening } from '#features/listen';

/** Subscriber audio has exactly the same lifetime as the reader who was allowed to read it. */
export function ListeningLifecycle(): null {
  useEffect(() => {
    listening.stop();
    const unsubscribe = READER.watch(() => {
      listening.stop();
    });
    return () => {
      unsubscribe();
      listening.stop();
    };
  }, []);
  return null;
}
