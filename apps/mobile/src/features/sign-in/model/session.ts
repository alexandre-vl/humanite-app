import { READER } from '#api';
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
 * The reader's connection, for the screens that show it and the two that change it.
 *
 * What happens to the paper when the connection changes is not here. It was, and that was the mistake: a screen is
 * not the only thing that changes the reader — a reading the service refuses under a dead token forgets that token
 * with nobody having pressed anything — and the paper read under the old one stayed in the cache, and on the disk,
 * of a phone whose session had ended. It is done once now, where the cache lives, on every change of the token
 * whatever caused it.
 */
export const useReaderSession = (): ReaderSession => ({
  offered: READER.offered(),
  connection: useConnection((session) => session.connection),
  signIn: useConnection((session) => session.open),
  signOut: useConnection((session) => session.close),
});
