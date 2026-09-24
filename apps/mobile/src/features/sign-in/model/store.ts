import { create } from 'zustand';
import { READER, refusalOf } from '#api';
import type { Refusal } from '#api';

/** Where a reader stands with the journal's service: out, on their way in, or in. */
export type Connection = 'out' | 'opening' | 'in';

/** How one attempt to open ended: it opened, the service refused it for a reason, or one was already under way. */
export type Opening =
  Readonly<{ kind: 'opened' }> | Readonly<{ kind: 'refused'; why: Refusal }> | Readonly<{ kind: 'busy' }>;

/**
 * Where the reader stands, read off the token itself rather than remembered beside it.
 *
 * The two could not drift while only this store moved the token. They can now: a reading the service refuses under a
 * dead token makes the door forget it (ADR-0033, R9), with nobody having pressed anything, and a copy taken at the
 * first line would have gone on saying the reader was signed in for as long as the app ran.
 */
const standing = (): Connection => (READER.token() === undefined ? 'out' : 'in');

/**
 * What the app knows of the reader's connection, and the two things it can do to it.
 *
 * What a reader typed is not here, and neither is what the service said of it. A login and a password are held by the
 * screen they are typed in, for as long as that screen is up, and go from there to the service — a password in a
 * store would outlive the screen, sit in whatever a debugger prints, and be one refactor away from a disk. A refusal
 * is held there too, for a plainer reason: it belongs to the attempt that earned it, and a store would still be
 * holding it an hour later, to show a reader who had typed nothing yet.
 *
 * What this holds is the state of the connection, which every screen may read and no part of which is a secret. It
 * follows the token rather than owning it: `watch` is subscribed once, for the life of the app, so the account screen
 * tells the truth however the token came to change.
 */
type Session = Readonly<{
  connection: Connection;
  open: (login: string, password: string) => Promise<Opening>;
  close: () => void;
}>;

export const useConnection = create<Session>()((set, get) => {
  READER.watch(() => {
    if (get().connection !== 'opening') {
      set({ connection: standing() });
    }
  });
  return {
    connection: standing(),
    open: async (login: string, password: string): Promise<Opening> => {
      if (get().connection === 'opening') {
        return { kind: 'busy' };
      }
      set({ connection: 'opening' });
      try {
        await READER.signIn({ login, password });
        return { kind: 'opened' };
      } catch (reason: unknown) {
        return { kind: 'refused', why: refusalOf(reason) };
      } finally {
        // Whatever happened, the connection is no longer on its way — and what it now is, is what the token says. A
        // path out of `opening` that depended on the attempt having ended one particular way is how a button comes to
        // read « Connexion en cours » for the life of a process.
        set({ connection: standing() });
      }
    },
    close: (): void => {
      READER.signOut();
      // Said here as well as followed through `watch`: forgetting a token that was already gone changes nothing and
      // notifies nobody, so a connection that had somehow got ahead of the token would stay wrong for ever. What is
      // read here is the token, not the press, so the two cannot disagree once this returns.
      set({ connection: standing() });
    },
  };
});
