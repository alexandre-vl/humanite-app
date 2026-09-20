import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AccountPage } from './account-page';

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
   */
  it('donne l’adresse de la rédaction, et ne propose rien qui ne mène nulle part', async () => {
    await render(<AccountPage />);
    expect(screen.getByText('relationlecteur@humanite.fr')).toBeTruthy();
    expect(screen.getByText('01 55 84 40 30')).toBeTruthy();
    expect(screen.queryByText('Restaurer mes achats')).toBeNull();
    expect(screen.queryByText('Supprimer mon compte')).toBeNull();
    expect(screen.queryByText('Déconnexion')).toBeNull();
  });
});
