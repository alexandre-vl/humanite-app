import { typographyAt } from '@huma/design-tokens';
import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { noteSetAside } from '#api';
import { styleOf } from '#lib/testing';
import { ICONS } from '#primitives/icon';
import { AccountPage } from './account-page';

/** The mark a row carries when touching it opens another screen, named through the registry rather than spelt out. */
const OPENS = `symbol:${ICONS.next.android}`;

jest.mock('expo-router', () => ({ __esModule: true, router: { push: jest.fn() } }));

describe('AccountPage', () => {
  it('ouvre les préférences d’affichage quand on touche la ligne qui les nomme', async () => {
    await render(<AccountPage />);
    await fireEvent.press(screen.getByText('Préférences d’affichage'));
    expect(jest.mocked(router.push)).toHaveBeenCalledWith('/settings');
  });

  /** The shelf of numéros is reached from here, the paper's own business being what this screen holds. */
  it('ouvre le kiosque quand on touche la ligne qui le nomme', async () => {
    await render(<AccountPage />);
    await fireEvent.press(screen.getByText('Kiosque'));
    expect(jest.mocked(router.push)).toHaveBeenCalledWith('/newsstand');
  });

  /** Items a reading could not make sense of are said once there are some, and not before: an empty count says nothing. */
  it('dit combien d’éléments illisibles le journal a servis, dès qu’il y en a', async () => {
    await render(<AccountPage />);
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
    await render(<AccountPage />);
    expect(screen.queryByText('Mes lectures')).toBeNull();
  });

  /**
   * The other end of the pair: this screen and the shelf beside it are the two tabs that have nothing better to print
   * at the top than their own name, and they print it in the same type. Each holds the promise from its own side, so
   * whichever of the two drifts is the one that fails.
   */
  it('se nomme dans le type dont l’étagère voisine se nomme', async () => {
    await render(<AccountPage />);
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
    await render(<AccountPage />);
    expect(screen.getByText('relationlecteur@humanite.fr')).toBeTruthy();
    expect(screen.getByText('01 55 84 40 30')).toBeTruthy();
    // The mark is hidden from a screen reader — the row it sits in already says where it goes — so it is counted here
    // as a view rather than as something announced. Two rows open something: how one reads, and where the numéros are.
    expect(screen.getAllByTestId(OPENS, { includeHiddenElements: true })).toHaveLength(2);
  });
});
