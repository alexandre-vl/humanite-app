import { SPACING } from '@huma/design-tokens';
import { isList, isRecord } from '@huma/unknown';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { READER } from '#api';
import { t } from '#i18n';
import { nearestAbove, renderWithCache, styleOf } from '#lib/testing';
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

/** Every word the screen prints, in the order it prints them — which is the order a reader meets them in. */
const wordsInOrder = (): readonly string[] => {
  const seen: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      seen.push(node);
    } else if (isList(node)) {
      for (const child of node) {
        walk(child);
      }
    } else if (isRecord(node)) {
      walk(node['children']);
    }
  };
  walk(screen.toJSON());
  return seen;
};

/** The store's own action, opening every connection and noting what it was handed. */
const watchingOpen = (): jest.Mock<(login: string, password: string) => Promise<Opening>> => {
  const open = jest.fn<(login: string, password: string) => Promise<Opening>>(async () =>
    Promise.resolve({ kind: 'opened' }),
  );
  useConnection.setState({ open });
  return open;
};

/** What a field holds, found by the words it stands under. */
const typed = (placeholder: 'signIn.login.placeholder' | 'signIn.password.placeholder'): unknown =>
  screen.getByPlaceholderText(t(placeholder)).props['value'];

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

  /** The one button of the screen, pressed, did nothing at all: it now says which field it found empty. */
  it('dit quel champ il manque quand on appuie avant de les avoir remplis', async () => {
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    await fireEvent.press(screen.getByText(t('signIn.submit')));
    expect(screen.getByText(t('signIn.missing.both.title'))).toBeTruthy();
    await fill(LOGIN, '');
    expect(screen.queryByText(t('signIn.missing.both.title'))).toBeNull();
    await fireEvent.press(screen.getByText(t('signIn.submit')));
    expect(screen.getByText(t('signIn.missing.password.title'))).toBeTruthy();
    await fill('', PASSWORD);
    await fireEvent.press(screen.getByText(t('signIn.submit')));
    expect(screen.getByText(t('signIn.missing.login.title'))).toBeTruthy();
  });

  /**
   * A placeholder is gone at the first letter, and the field then said only what it held. The name is heard on the
   * field, and the word drawn over it is not read a second time on a line of its own.
   */
  it('nomme chaque champ à qui écoute l’écran, et une seule fois', async () => {
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    await fill(LOGIN, PASSWORD);
    expect(screen.getByLabelText(t('signIn.login')).props['value']).toBe(LOGIN);
    expect(screen.getByLabelText(t('signIn.password')).props['value']).toBe(PASSWORD);
    for (const label of ['signIn.login', 'signIn.password'] as const) {
      expect(screen.getByText(t(label), { includeHiddenElements: true })).toBeTruthy();
      expect(screen.queryByText(t(label))).toBeNull();
    }
  });

  it('dit que le journal a refusé les identifiants, dans ses mots', async () => {
    answering({ kind: 'refused', why: 'refused' });
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    expect(screen.queryByText(t('signIn.refused.title'))).toBeNull();
    await attempt();
    expect(screen.getByText(t('signIn.refused.title'))).toBeTruthy();
  });

  it('dit que le journal n’a pas répondu, quand c’est cela qui s’est passé', async () => {
    answering({ kind: 'refused', why: 'unavailable' });
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    await attempt();
    expect(screen.getByText(t('signIn.unavailable.title'))).toBeTruthy();
  });

  /**
   * The refusal belongs to the attempt that earned it. A reader correcting a typo has already understood, and it was
   * also greeting readers who reopened the screen an hour later, before they had typed anything.
   */
  it('efface le refus dès la première touche, sur l’un ou l’autre champ', async () => {
    answering({ kind: 'refused', why: 'refused' });
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    await attempt();
    expect(screen.getByText(t('signIn.refused.title'))).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText(t('signIn.login.placeholder')), 'l');
    expect(screen.queryByText(t('signIn.refused.title'))).toBeNull();
  });

  /** A reader who is listening has their focus on the button they pressed; the line says itself out loud. */
  it('fait annoncer le refus à qui écoute l’écran', async () => {
    answering({ kind: 'refused', why: 'refused' });
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    await attempt();
    expect(screen.getByText(t('signIn.refused.title')).props['accessibilityLiveRegion']).toBe('assertive');
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

  /**
   * The order on the page is the order of the thought: what you typed, what went wrong with it, what to do about it.
   * The refusal was under the button, where it read as one more paragraph and ran straight into the line saying where
   * a subscription is bought — which told a subscriber who had mistyped their password to go and buy one.
   */
  it('met le refus entre le dernier champ et le bouton, et non sous lui', async () => {
    answering({ kind: 'refused', why: 'refused' });
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    await attempt();
    const order = wordsInOrder();
    expect(order.indexOf(t('signIn.password'))).toBeLessThan(order.indexOf(t('signIn.refused.title')));
    expect(order.indexOf(t('signIn.refused.title'))).toBeLessThan(order.indexOf(t('signIn.submit')));
    expect(order.indexOf(t('signIn.submit'))).toBeLessThan(order.indexOf(t('signIn.where')));
  });

  /**
   * The journal's red is proven as text at twenty-four points and at no step below, so a refusal set in it would be
   * one a reader who has asked for smaller type cannot read. The red belongs to the bar beside the words.
   */
  it('n’écrit pas le refus dans le rouge du journal, qu’aucun petit corps ne porte', async () => {
    answering({ kind: 'refused', why: 'refused' });
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    await attempt();
    expect(styleOf(screen.getByText(t('signIn.refused.message')))['color']).toBe(
      styleOf(screen.getByText(t('signIn.message')))['color'],
    );
  });

  /**
   * Grown only by its padding, a field was 28,3 points tall and that was the whole of what a thumb could land on
   * (iPhone simulator, 25/09/2026). Each fills a line a grid step tall, as the search field does.
   */
  it('donne à chaque champ toute une ligne sous le doigt', async () => {
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    for (const placeholder of ['signIn.login.placeholder', 'signIn.password.placeholder'] as const) {
      const field = screen.getByPlaceholderText(t(placeholder));
      expect(styleOf(field)['alignSelf']).toBe('stretch');
      const floor = nearestAbove(
        field,
        (node) => {
          const style = styleOf(node);
          return typeof style['minHeight'] === 'number' ? style['minHeight'] : undefined;
        },
        'rien autour du champ ne dit la hauteur de sa ligne',
      );
      expect(floor).toBeGreaterThanOrEqual(SPACING.xxxl);
    }
  });

  /** The identifier hands the reader on to the password, and its key sends nothing: the pair is not whole yet. */
  it('passe de l’identifiant au mot de passe par la touche du clavier, sans rien envoyer', async () => {
    const opening = watchingOpen();
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    const login = screen.getByPlaceholderText(t('signIn.login.placeholder'));
    expect(login.props['returnKeyType']).toBe('next');
    await fireEvent.changeText(login, LOGIN);
    await fireEvent(login, 'submitEditing');
    expect(opening).not.toHaveBeenCalled();
    expect(screen.queryByText(t('signIn.missing.password.title'))).toBeNull();
    expect(screen.getByPlaceholderText(t('signIn.password.placeholder')).props['returnKeyType']).toBe('go');
  });

  /** A refused password stays, for the eye to show it and one wrong letter to be mended rather than all of it typed. */
  it('garde le mot de passe refusé, pour qu’on le relise', async () => {
    answering({ kind: 'refused', why: 'refused' });
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    await attempt();
    expect(typed('signIn.login.placeholder')).toBe(LOGIN);
    expect(typed('signIn.password.placeholder')).toBe(PASSWORD);
  });

  /** A journal that did not answer refused nothing: the pair stays for the next try. */
  it('garde toute la paire quand le journal n’a pas répondu', async () => {
    answering({ kind: 'refused', why: 'unavailable' });
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    await attempt();
    expect(typed('signIn.login.placeholder')).toBe(LOGIN);
    expect(typed('signIn.password.placeholder')).toBe(PASSWORD);
  });

  /** A password typed blind is one mistyped blind: the eye shows it, and hides it again. */
  it('montre le mot de passe à qui le demande, et le cache de nouveau', async () => {
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    const secret = (): unknown =>
      screen.getByPlaceholderText(t('signIn.password.placeholder')).props['secureTextEntry'];
    expect(secret()).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: t('signIn.password.show') }));
    expect(secret()).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: t('signIn.password.hide') }));
    expect(secret()).toBe(true);
  });

  /** An address pasted from a message brings its spaces with it, and the service refuses an address with spaces. */
  it('porte l’identifiant au service sans les espaces qu’un collage emporte', async () => {
    const opening = watchingOpen();
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    await fill(`  ${LOGIN} `, PASSWORD);
    await fireEvent.press(screen.getByText(t('signIn.submit')));
    await act(async () => Promise.resolve());
    expect(opening).toHaveBeenCalledWith(LOGIN, PASSWORD);
  });

  /**
   * A field's name answers a finger, as a form's label does: pressed, it puts the caret in the field. A reader
   * listening reaches the field itself and hears it named there, so the name is no stop of its own.
   */
  it('rend le nom de chaque champ sensible au doigt, sans en faire un arrêt de plus', async () => {
    await renderWithCache(<SignInForm onOpened={() => undefined} />);
    for (const label of ['signIn.login', 'signIn.password'] as const) {
      const name = nearestAbove(
        screen.getByText(t(label), { includeHiddenElements: true }),
        (node) => (node.props['onStartShouldSetResponder'] === undefined ? undefined : node),
        'rien autour du nom ne répond au doigt',
      );
      expect(name.props['accessible']).toBe(false);
    }
  });
});
