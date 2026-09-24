import { create } from 'zustand';
import { READER, refusalOf } from '#api';
import type { Refusal } from '#api';

/** Where a reader stands with the journal's service: out, on their way in, or in. */
export type Connection = 'out' | 'opening' | 'in';

/**
 * What the app knows of the reader's connection, and the two things it can do to it.
 *
 * What a reader typed is not here. A login and a password are held by the field they are typed in, for as long as
 * the screen showing that field is up, and go from there to the service — a password in a store would outlive the
 * screen, sit in whatever a debugger prints, and be one refactor away from a disk. What this holds is the state of
 * the connection, which every screen may read, and no part of which is a secret.
 *
 * Nothing here persists: the token does, in the reader, and this reads it once at the first line to open where the
 * phone left off.
 */
type Session = Readonly<{
  connection: Connection;
  refusal: Refusal | null;
  /** Opens the connection, and answers whether it opened. A second call while one is under way does nothing. */
  open: (login: string, password: string) => Promise<boolean>;
  close: () => void;
}>;

export const useConnection = create<Session>()((set, get) => ({
  connection: READER.token() === undefined ? 'out' : 'in',
  refusal: null,
  open: async (login: string, password: string): Promise<boolean> => {
    if (get().connection === 'opening') {
      return false;
    }
    set({ connection: 'opening', refusal: null });
    try {
      await READER.signIn({ login, password });
      set({ connection: 'in', refusal: null });
      return true;
    } catch (reason: unknown) {
      set({ connection: 'out', refusal: refusalOf(reason) });
      return false;
    }
  },
  close: (): void => {
    READER.signOut();
    set({ connection: 'out', refusal: null });
  },
}));
