import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { READER } from '#api';
import { useConnection } from '#features/sign-in';
import { t } from '#i18n';
import { renderWithCache } from '#lib/testing';
import { SignInPage } from './sign-in-page';

jest.mock('expo-router', () => ({ __esModule: true, router: { back: jest.fn() } }));

beforeEach(() => {
  jest.restoreAllMocks();
  jest.mocked(router.back).mockClear();
  useConnection.setState({ connection: 'out' });
});

describe('SignInPage', () => {
  it('se nomme dans sa barre, et porte le formulaire de connexion', async () => {
    await renderWithCache(<SignInPage />);
    expect(screen.getByText(t('signIn.screen'))).toBeTruthy();
    expect(screen.getByPlaceholderText(t('signIn.login.placeholder'))).toBeTruthy();
    expect(screen.getByPlaceholderText(t('signIn.password.placeholder'))).toBeTruthy();
  });

  /** The reader came from somewhere and wanted that somewhere without the wall; they are put back there at once. */
  it('revient d’où le lecteur venait dès que la connexion est ouverte', async () => {
    jest.spyOn(READER, 'signIn').mockResolvedValue(undefined);
    await renderWithCache(<SignInPage />);
    await fireEvent.changeText(screen.getByPlaceholderText(t('signIn.login.placeholder')), 'lecteur@example.org');
    await fireEvent.changeText(screen.getByPlaceholderText(t('signIn.password.placeholder')), 'un-mot-de-passe');
    await fireEvent.press(screen.getByText(t('signIn.submit')));
    expect(jest.mocked(router.back)).toHaveBeenCalledTimes(1);
  });

  it('ne revient nulle part quand le journal a refusé', async () => {
    jest.spyOn(READER, 'signIn').mockRejectedValue(new Error('refusé'));
    await renderWithCache(<SignInPage />);
    await fireEvent.changeText(screen.getByPlaceholderText(t('signIn.login.placeholder')), 'lecteur@example.org');
    await fireEvent.changeText(screen.getByPlaceholderText(t('signIn.password.placeholder')), 'faux');
    await fireEvent.press(screen.getByText(t('signIn.submit')));
    expect(jest.mocked(router.back)).not.toHaveBeenCalled();
    expect(screen.getByText(t('signIn.unavailable'))).toBeTruthy();
  });
});
