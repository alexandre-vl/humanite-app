import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { READER } from '#api';
import { useConnection } from './store';

const CREDENTIALS = { login: 'lecteur@example.org', password: 'un-mot-de-passe' };

beforeEach(() => {
  jest.restoreAllMocks();
  useConnection.setState({ connection: 'out', refusal: null });
});

describe('useConnection', () => {
  it('tient la connexion ouverte quand le service a rendu un jeton', async () => {
    const opening = jest.spyOn(READER, 'signIn').mockResolvedValue(undefined);
    await expect(useConnection.getState().open(CREDENTIALS.login, CREDENTIALS.password)).resolves.toBe(true);
    expect(opening).toHaveBeenCalledWith(CREDENTIALS);
    expect(useConnection.getState()).toMatchObject({ connection: 'in', refusal: null });
  });

  it('retombe dehors en disant pourquoi quand le service n’a pas répondu', async () => {
    jest.spyOn(READER, 'signIn').mockRejectedValue(new Error('le service ne répond pas'));
    await expect(useConnection.getState().open(CREDENTIALS.login, CREDENTIALS.password)).resolves.toBe(false);
    expect(useConnection.getState()).toMatchObject({ connection: 'out', refusal: 'unavailable' });
  });

  /** Two presses on one button are one connection: the second finds one under way and leaves it alone. */
  it('n’ouvre pas une seconde connexion pendant qu’une première est en route', async () => {
    const opening = jest.spyOn(READER, 'signIn').mockResolvedValue(undefined);
    const first = useConnection.getState().open(CREDENTIALS.login, CREDENTIALS.password);
    await expect(useConnection.getState().open(CREDENTIALS.login, CREDENTIALS.password)).resolves.toBe(false);
    await expect(first).resolves.toBe(true);
    expect(opening).toHaveBeenCalledTimes(1);
  });

  /** The refusal of a first try is not still on screen while a second is under way. */
  it('efface le refus précédent dès qu’une connexion repart', async () => {
    jest.spyOn(READER, 'signIn').mockResolvedValue(undefined);
    useConnection.setState({ refusal: 'refused' });
    await useConnection.getState().open(CREDENTIALS.login, CREDENTIALS.password);
    expect(useConnection.getState().refusal).toBeNull();
  });

  it('oublie le lecteur, jeton compris, quand il se déconnecte', () => {
    const forgetting = jest.spyOn(READER, 'signOut').mockReturnValue(undefined);
    useConnection.setState({ connection: 'in' });
    useConnection.getState().close();
    expect(forgetting).toHaveBeenCalledTimes(1);
    expect(useConnection.getState()).toMatchObject({ connection: 'out', refusal: null });
  });
});
