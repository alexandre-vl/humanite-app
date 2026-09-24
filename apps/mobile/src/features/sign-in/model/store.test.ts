import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { READER } from '#api';
import { useConnection } from './store';

const LOGIN = 'lecteur@example.org';
const PASSWORD = 'un-mot-de-passe';

beforeEach(() => {
  jest.restoreAllMocks();
  READER.signOut();
  useConnection.setState({ connection: 'out' });
});

describe('useConnection', () => {
  it('tient la connexion ouverte quand le service a rendu un jeton', async () => {
    jest.spyOn(READER, 'token').mockReturnValue('jeton-de-labonne');
    const opening = jest.spyOn(READER, 'signIn').mockResolvedValue(undefined);
    await expect(useConnection.getState().open(LOGIN, PASSWORD)).resolves.toEqual({ kind: 'opened' });
    expect(opening).toHaveBeenCalledWith({ login: LOGIN, password: PASSWORD });
    expect(useConnection.getState().connection).toBe('in');
  });

  it('retombe dehors en disant pourquoi quand le service n’a pas répondu', async () => {
    jest.spyOn(READER, 'signIn').mockRejectedValue(new Error('le service ne répond pas'));
    await expect(useConnection.getState().open(LOGIN, PASSWORD)).resolves.toEqual({
      kind: 'refused',
      why: 'unavailable',
    });
    expect(useConnection.getState().connection).toBe('out');
  });

  /** Two presses on one button are one connection: the second finds one under way and says so rather than lying. */
  it('n’ouvre pas une seconde connexion pendant qu’une première est en route', async () => {
    const opening = jest.spyOn(READER, 'signIn').mockResolvedValue(undefined);
    const first = useConnection.getState().open(LOGIN, PASSWORD);
    await expect(useConnection.getState().open(LOGIN, PASSWORD)).resolves.toEqual({ kind: 'busy' });
    await first;
    expect(opening).toHaveBeenCalledTimes(1);
  });

  /**
   * The state that stranded a reader. Whatever an attempt did — answered, refused, threw on a path nobody wrote —
   * the connection is no longer on its way, and what it is is what the token says. A button that could stay on
   * « Connexion en cours » is a button the reader can never press again.
   */
  it('ne reste jamais « en cours », quoi qu’ait fait la tentative', async () => {
    jest.spyOn(READER, 'signIn').mockResolvedValue(undefined);
    await useConnection.getState().open(LOGIN, PASSWORD);
    expect(useConnection.getState().connection).not.toBe('opening');
    jest.spyOn(READER, 'signIn').mockRejectedValue(new Error('cassé sur un chemin que personne n’a écrit'));
    await useConnection.getState().open(LOGIN, PASSWORD);
    expect(useConnection.getState().connection).not.toBe('opening');
  });

  it('oublie le lecteur, jeton compris, quand il se déconnecte', () => {
    const forgetting = jest.spyOn(READER, 'signOut').mockReturnValue(undefined);
    useConnection.setState({ connection: 'in' });
    useConnection.getState().close();
    expect(forgetting).toHaveBeenCalledTimes(1);
  });

  /**
   * Forgetting a token that had already gone changes nothing and tells nobody, so a connection that only followed
   * those changes would stay « connecté » for ever on a reader with no token. It is read off the token instead.
   */
  it('redescend sur le jeton même quand rien n’avait à changer', () => {
    jest.spyOn(READER, 'token').mockReturnValue(undefined);
    useConnection.setState({ connection: 'in' });
    useConnection.getState().close();
    expect(useConnection.getState().connection).toBe('out');
  });
});
