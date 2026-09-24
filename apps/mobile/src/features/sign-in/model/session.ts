import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { READER } from '#api';
import { STORAGE_KEYS, storage } from '#lib/storage';
import { useConnection } from './store';
import type { Connection, Opening } from './store';

/** The reader's connection as a screen uses it: what it is, and the two ways to change it. */
export type ReaderSession = Readonly<{
  /** Whether this build can open a connection at all; a screen offers nothing when it cannot. */
  offered: boolean;
  connection: Connection;
  signIn: (login: string, password: string) => Promise<Opening>;
  signOut: () => void;
}>;

/**
 * Everything the app is holding of the paper, forgotten — in memory and on the disk both.
 *
 * It was all read as whoever was signed in when it was read: an article the service withheld from nobody is kept as
 * withheld, and a list carries that on every card. So the paper is dropped whenever the reader changes, and what is
 * on screen is asked again under whoever is signed in now.
 *
 * The disk is emptied by name rather than left to follow the memory. The cache is written through a door that holds a
 * write for a second, so an app killed inside that second would restart on the pages of the reader who has just gone;
 * and a cache that was already empty in memory emits nothing for that door to carry, so nothing would have been
 * written at all. Removing the one key the registry declares for it closes both, and costs a call.
 */
const forgetThePaper = (cache: QueryClient): void => {
  void cache.resetQueries();
  storage.remove(STORAGE_KEYS.queryCache);
};

/**
 * The connection, with what has to happen to the paper each time it changes.
 *
 * The clearing lives here rather than in the store because the cache is the app's, handed down through its provider,
 * and a store of a feature has no business reaching for it. Queries are reset rather than dropped: the screens behind
 * this one keep their observers and ask again, where dropping the queries outright would leave them pointing at
 * nothing until something else made them render.
 */
export const useReaderSession = (): ReaderSession => {
  const cache = useQueryClient();
  const connection = useConnection((session) => session.connection);
  const open = useConnection((session) => session.open);
  const close = useConnection((session) => session.close);
  return {
    offered: READER.offered(),
    connection,
    signIn: async (login: string, password: string): Promise<Opening> => {
      const opening = await open(login, password);
      if (opening.kind === 'opened') {
        forgetThePaper(cache);
      }
      return opening;
    },
    signOut: (): void => {
      close();
      forgetThePaper(cache);
    },
  };
};
