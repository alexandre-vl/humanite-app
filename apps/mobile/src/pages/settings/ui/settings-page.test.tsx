import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { usePreferences } from '#features/preferences';
import { SettingsPage } from './settings-page';

jest.mock('expo-router', () => ({ __esModule: true, router: { back: jest.fn() } }));

/** The sample the screen sets in an article's own prose, named once so the assertions read as the screen does. */
const SAMPLE =
  'Les grévistes de la raffinerie ont voté la reconduction du mouvement jusqu’à lundi, au terme d’une assemblée générale qui a réuni près de six cents salariés.';

const choose = async (label: string): Promise<void> => {
  await fireEvent.press(screen.getByRole('radio', { name: label }));
};

beforeEach(async () => {
  usePreferences.getState().reset();
  await render(<SettingsPage />);
});

describe('SettingsPage', () => {
  it('montre ce qu’on peut régler, et un aperçu de ce que cela donne', () => {
    expect(screen.getByText('Apparence')).toBeTruthy();
    expect(screen.getByText('Taille du texte')).toBeTruthy();
    expect(screen.getByText(SAMPLE)).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Système', selected: true })).toBeTruthy();
  });

  it('retient le thème choisi et le dit à toute l’app', async () => {
    await choose('Sombre');
    expect(usePreferences.getState().theme).toBe('dark');
    expect(screen.getByRole('radio', { name: 'Sombre', selected: true })).toBeTruthy();
  });

  /**
   * The step is written to the store, which is what the whole app reads: what that does to the letters is proved where
   * the store meets them, at the root of the app, and what it does to this sample follows from the same two contexts.
   */
  it('retient le cran qu’on vient de poser', async () => {
    await choose('Très grand');
    expect(usePreferences.getState().scale).toBe('huge');
    expect(screen.getByRole('radio', { name: 'Très grand', selected: true })).toBeTruthy();
  });

  it('passe le journal dans les lettres faciles, et l’en sort', async () => {
    await fireEvent(screen.getByLabelText('Lisibilité renforcée'), 'valueChange', true);
    expect(usePreferences.getState().faces).toBe('legible');
    await fireEvent(screen.getByLabelText('Lisibilité renforcée'), 'valueChange', false);
    expect(usePreferences.getState().faces).toBe('paper');
  });

  it('rend au journal ses propres réglages', async () => {
    await choose('Petit');
    await choose('Clair');
    await fireEvent.press(screen.getByText('Réinitialiser'));
    expect(usePreferences.getState().scale).toBe('normal');
    expect(usePreferences.getState().theme).toBe('system');
    expect(screen.getByRole('radio', { name: 'Normal', selected: true })).toBeTruthy();
  });
});
