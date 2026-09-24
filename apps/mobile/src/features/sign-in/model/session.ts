import { useQueryClient } from '@tanstack/react-query';
import { READER } from '#api';
import type { Refusal } from '#api';
import { useConnection } from './store';
import type { Connection } from './store';

/** The reader's connection as a screen uses it: what it is, why it last failed, and the two ways to change it. */
export type ReaderSession = Readonly<{
  /** Whether this build can open a connection at all; a screen offers nothing when it cannot. */
  offered: boolean;
  connection: Connection;
  refusal: Refusal | null;
  signIn: (login: string, password: string) => Promise<boolean>;
  signOut: () => void;
}>;

/**
 * The connection, with what has to happen to the paper each time it changes.
 *
 * Everything the app is holding was read as whoever was signed in when it was read: an article the service withheld
 * from nobody is kept as withheld, and a list carries the same flag on every card of it. So signing in or out empties
 * the cache — on the phone's disk as well, the same store being what the app restores from — and what is on screen
 * is asked again, under whoever is signed in now. Anything less shows a reader the wall they have just paid to pass,
 * until something else happens to make the page stale.
 *
 * The clearing lives here rather than in the store because the cache is the app's, handed down through its provider,
 * and a store of a feature has no business reaching for it.
 */
export const useReaderSession = (): ReaderSession => {
  const cache = useQueryClient();
  const connection = useConnection((session) => session.connection);
  const refusal = useConnection((session) => session.refusal);
  const open = useConnection((session) => session.open);
  const close = useConnection((session) => session.close);
  return {
    offered: READER.offered(),
    connection,
    refusal,
    signIn: async (login: string, password: string): Promise<boolean> => {
      const opened = await open(login, password);
      if (opened) {
        cache.clear();
      }
      return opened;
    },
    signOut: (): void => {
      close();
      cache.clear();
    },
  };
};
