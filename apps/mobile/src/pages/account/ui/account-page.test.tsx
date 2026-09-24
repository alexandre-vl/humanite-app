import { typographyAt } from '@huma/design-tokens';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { noteSetAside, READER } from '#api';
import { useConnection } from '#features/sign-in';
import { renderWithCache, styleOf } from '#lib/testing';
import { ICONS } from '#primitives/icon';
import { AccountPage } from './account-page';

/** The mark a row carries when touching it opens another screen, named through the registry rather than spelt out. */
const OPENS = `symbol:${ICONS.next.android}`;

jest.mock('expo-router', () => ({ __esModule: true, router: { push: jest.fn() } }));

/** A build started with the journal's key, which is what makes the screen offer a connection at all. */
const withKey = (): void => {
  jest.spyOn(READER, 'offered').mockReturnValue(true);
};

afterEach(() => {
  jest.restoreAllMocks();
  useConnection.setState({ connection: 'out', refusal: null });
});

describe('AccountPage', () => {
  it('ouvre les préférences d’affichage quand on touche la ligne qui les nomme', async () => {
    await renderWithCache(<AccountPage />);
    await fireEvent.press(screen.getByText('Préférences d’affichage'));
    expect(jest.mocked(router.push)).toHaveBeenCalledWith('/settings');
  });

  /** The shelf of numéros is reached from here, the paper's own business being what this screen holds. */
  it('ouvre le kiosque quand on touche la ligne qui le nomme', async () => {
    await renderWithCache(<AccountPage />);
    await fireEvent.press(screen.getByText('Kiosque'));
    expect(jest.mocked(router.push)).toHaveBeenCalledWith('/newsstand');
  });

  /** Items a reading could not make sense of are said once there are some, and not before: an empty count says nothing. */
  it('dit combien d’éléments illisibles le journal a servis, dès qu’il y en a', async () => {
    await renderWithCache(<AccountPage />);
    expect(screen.queryByText(/illisible/u)).toBeNull();
    await act(() => {
      noteSetAside('wire', [
        { at: 0, says: 'article_format : podcast' },
        { at: 3, says: 'date : « hier » ne nomme aucun instant' },
      ]);
    });
    expect(screen.getByText('2 éléments illisibles écartés')).toBeTruthy();
  });

  /** What the reader kept has a tab of its own; a row here would be a third door to the room next door. */
  it('n’offre pas une seconde porte vers ce que le lecteur a gardé', async () => {
    await renderWithCache(<AccountPage />);
    expect(screen.queryByText('Mes lectures')).toBeNull();
  });

  /**
   * The other end of the pair: this screen and the shelf beside it are the two tabs that have nothing better to print
   * at the top than their own name, and they print it in the same type. Each holds the promise from its own side, so
   * whichever of the two drifts is the one that fails.
   */
  it('se nomme dans le type dont l’étagère voisine se nomme', async () => {
    await renderWithCache(<AccountPage />);
    expect(styleOf(screen.getByText('Mon compte'))['fontSize']).toBe(typographyAt('display', 'normal', 'paper').size);
  });

  /**
   * Five of the eight rows the current app lists cannot mean anything here — there is no account to sign into, nothing
   * to buy and no library to open — so the screen holds what is true and draws nothing that would lead nowhere.
   *
   * What holds it is the count of rows carrying the mark that says a row opens something. Naming the five was not
   * holding anything: those words exist only in the reference document, no code path can render them, and an
   * assertion nothing can make fail is not one. A sixth row added tomorrow would have passed it, and fails this.
   */
  it('donne l’adresse de la rédaction, et n’ouvre rien d’autre', async () => {
    await renderWithCache(<AccountPage />);
    expect(screen.getByText('relationlecteur@humanite.fr')).toBeTruthy();
    expect(screen.getByText('01 55 84 40 30')).toBeTruthy();
    // The mark is hidden from a screen reader — the row it sits in already says where it goes — so it is counted here
    // as a view rather than as something announced. Two rows open something: how one reads, and where the numéros are.
    expect(screen.getAllByTestId(OPENS, { includeHiddenElements: true })).toHaveLength(2);
  });

  /** A published build has no key, so there is no connection on the other side of the row and no row. */
  it('n’offre pas de connexion à une build qui n’a pas la clé du journal', async () => {
    await renderWithCache(<AccountPage />);
    expect(screen.queryByText('Se connecter')).toBeNull();
    expect(screen.queryByText('Mon abonnement')).toBeNull();
  });

  it('ouvre la connexion quand la build a la clé et que personne n’est connecté', async () => {
    withKey();
    await renderWithCache(<AccountPage />);
    await fireEvent.press(screen.getByText('Se connecter'));
    expect(jest.mocked(router.push)).toHaveBeenCalledWith('/sign-in');
    // A third row opens something now: how one reads, where the numéros are, and where a subscriber signs in.
    expect(screen.getAllByTestId(OPENS, { includeHiddenElements: true })).toHaveLength(3);
  });

  /** Signing out is done here and opens nothing, so its row carries no mark that a row opens something. */
  it('propose de se déconnecter, sans marque d’ouverture, quand l’abonné est connecté', async () => {
    withKey();
    await act(() => {
      useConnection.setState({ connection: 'in', refusal: null });
    });
    await renderWithCache(<AccountPage />);
    expect(screen.getByText('Se déconnecter')).toBeTruthy();
    expect(screen.queryByText('Se connecter')).toBeNull();
    expect(screen.getAllByTestId(OPENS, { includeHiddenElements: true })).toHaveLength(2);
  });
});
