import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
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
    // as a view rather than as something announced.
    expect(screen.getAllByTestId(OPENS, { includeHiddenElements: true })).toHaveLength(1);
  });
});
