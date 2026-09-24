import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { READER } from '#api';
import { t } from '#i18n';
import { renderWithCache, styleOf } from '#lib/testing';
import type { Opening } from '../model/store';
import { useConnection } from '../model/store';
import { SignInForm } from './sign-in-form';

const LOGIN = 'lecteur@example.org';
const PASSWORD = 'un-mot-de-passe';

/** Types a subscriber's pair into the two fields, each found by the words it stands under. */
const fill = async (login: string, password: string): Promise<void> => {
  await fireEvent.changeText(screen.getByPlaceholderText(t('signIn.login.placeholder')), login);
  await fireEvent.changeText(screen.getByPlaceholderText(t('signIn.password.placeholder')), password);
};

/** The store's own action, answering what the test wants to see the screen do with it. */
const answering = (opening: Opening): void => {
  useConnection.setState({ open: async () => Promise.resolve(opening) });
};

/** Types the pair and presses, then lets the press settle. */
const attempt = async (): Promise<void> => {
  await fill(LOGIN, PASSWORD);
  await fireEvent.press(screen.getByText(t('signIn.submit')));
  await act(async () => Promise.resolve());
};

beforeEach(() => {
  jest.restoreAllMocks();
  useConnection.setState({ connection: 'out' });
});

describe('SignInForm', () => {
  it('porte au service ce que l’abonné a tapé, et le dit à l’écran', async () => {
    const opening = jest.spyOn(READER, 'signIn').mockResolvedValue(undefined);
    const opened = jest.fn();
    await renderWithCache(<SignInForm onOpened={opened} />);
    await attempt();
    expect(opening).toHaveBeenCalledWith({ login: LOGIN, password: PASSWORD });
    expect(opened).toHaveBeenCalledTimes(1);
  });

  /** Half a pair opens nothing, and a request that could only be refused is not worth a reader's wait. */
  it('n’appelle pas le service tant qu’un des deux champs est vide', async () => {
    const opening = jest.spyOn(READER, 'signIn').mockResolvedValue(undefined);
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    await fireEvent.press(screen.getByText(t('signIn.submit')));
    await fill(LOGIN, '');
    await fireEvent.press(screen.getByText(t('signIn.submit')));
    expect(opening).not.toHaveBeenCalled();
  });

  it('dit que le journal a refusé les identifiants, dans ses mots', async () => {
    answering({ kind: 'refused', why: 'refused' });
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    expect(screen.queryByText(t('signIn.refused'))).toBeNull();
    await attempt();
    expect(screen.getByText(t('signIn.refused'))).toBeTruthy();
  });

  it('dit que le journal n’a pas répondu, quand c’est cela qui s’est passé', async () => {
    answering({ kind: 'refused', why: 'unavailable' });
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    await attempt();
    expect(screen.getByText(t('signIn.unavailable'))).toBeTruthy();
  });

  /**
   * The refusal belongs to the attempt that earned it. A reader correcting a typo has already understood, and it was
   * also greeting readers who reopened the screen an hour later, before they had typed anything.
   */
  it('efface le refus dès la première touche, sur l’un ou l’autre champ', async () => {
    answering({ kind: 'refused', why: 'refused' });
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    await attempt();
    expect(screen.getByText(t('signIn.refused'))).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText(t('signIn.login.placeholder')), 'l');
    expect(screen.queryByText(t('signIn.refused'))).toBeNull();
  });

  /** A reader who is listening has their focus on the button they pressed; the line says itself out loud. */
  it('fait annoncer le refus à qui écoute l’écran', async () => {
    answering({ kind: 'refused', why: 'refused' });
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    await attempt();
    expect(screen.getByText(t('signIn.refused')).props['accessibilityLiveRegion']).toBe('assertive');
  });

  /** The button keeps its promise while a connection is opening: it says so rather than looking pressable and idle. */
  it('dit qu’une connexion est en route, sur le bouton même', async () => {
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    await act(() => {
      useConnection.setState({ connection: 'opening' });
    });
    expect(screen.getByText(t('signIn.opening'))).toBeTruthy();
    expect(screen.queryByText(t('signIn.submit'))).toBeNull();
  });

  /** The keychain is told which of the two each field holds, and the password is never shown. */
  it('demande au trousseau la bonne moitié de la paire, et cache le mot de passe', async () => {
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    const login = screen.getByPlaceholderText(t('signIn.login.placeholder'));
    const password = screen.getByPlaceholderText(t('signIn.password.placeholder'));
    expect(login.props['autoComplete']).toBe('username');
    expect(login.props['keyboardType']).toBe('email-address');
    expect(password.props['autoComplete']).toBe('current-password');
    expect(password.props['secureTextEntry']).toBe(true);
  });

  /** Where a subscription is taken is named in words: no app may send a reader to a purchase. */
  it('nomme où l’abonnement se souscrit, sans rien qui réponde à une pression', async () => {
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    expect(screen.getByText(t('signIn.where'))).toBeTruthy();
  });

  /**
   * The paper is printed at four steps of type, the reader choosing which. A field measured in points is measured for
   * one of them: at thirty-two it cut the tops off the letters at the smallest step already, the platform's own
   * padding having pushed the line down onto the rule under it, and nothing would have caught it but looking.
   */
  it('ne mesure aucun de ses champs en points, la taille du texte étant au lecteur', async () => {
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    for (const placeholder of ['signIn.login.placeholder', 'signIn.password.placeholder'] as const) {
      expect(styleOf(screen.getByPlaceholderText(t(placeholder)))['height']).toBeUndefined();
    }
  });
});
