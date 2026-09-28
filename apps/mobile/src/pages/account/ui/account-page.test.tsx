import { typographyAt } from '@huma/design-tokens';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ALERTS, noteSetAside, READER } from '#api';
import { NEWSROOM } from '#config';
import { useAlerts } from '#features/alerts';
import { useConnection } from '#features/sign-in';
import { openAppSettings, openExternal } from '#lib/routing';
import { renderWithCache, styleOf } from '#lib/testing';
import { ICONS } from '#primitives/icon';
import { AccountPage } from './account-page';

/** The mark a row carries when touching it opens another screen, named through the registry rather than spelt out. */
const OPENS = `symbol:${ICONS.next.android}`;

jest.mock('expo-router', () => ({ __esModule: true, router: { push: jest.fn() } }));
// Only the door out is replaced: the screen reads its own routes from the same module, and a whole mock would take
// them with it.
jest.mock('#lib/routing', () => ({
  __esModule: true,
  ...jest.requireActual<object>('#lib/routing'),
  openExternal: jest.fn(),
  openAppSettings: jest.fn(),
}));

/** A build started with the journal's key, which is what makes the screen offer a connection at all. */
const withKey = (): void => {
  jest.spyOn(READER, 'offered').mockReturnValue(true);
};

/** A build that receives the journal's alerts: one of the service, on Android, which the bench is neither. */
const withAlerts = (): void => {
  jest.spyOn(ALERTS, 'offered').mockReturnValue(true);
};

afterEach(() => {
  jest.restoreAllMocks();
  useConnection.setState({ connection: 'out' });
  useAlerts.setState({ wanted: false, asking: false, blocked: false });
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
   * A heading centred under a screen's name set at the left edge, over rows set at the left edge, was the one thing on
   * the screen that started from nowhere; the reading settings, one press away, set the same headings at that edge.
   */
  it('part du bord d’où partent le nom de l’écran et ses lignes pour nommer chaque groupe', async () => {
    await renderWithCache(<AccountPage />);
    const edge = styleOf(screen.getByText('Mon compte'))['textAlign'];
    for (const group of ['Réglages', 'Nous contacter']) {
      expect(styleOf(screen.getByText(group))['textAlign']).toBe(edge);
    }
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

  /**
   * Signing out is done here and opens nothing, so its row carries no mark that a row opens something — and, having
   * no mark, is set in the colour the paper gives what one may press, or it would read as inert as the line saying
   * the reader is connected, right above it.
   */
  it('propose de se déconnecter, sans marque d’ouverture mais dans l’encre des choses qu’on presse', async () => {
    withKey();
    await act(() => {
      useConnection.setState({ connection: 'in' });
    });
    await renderWithCache(<AccountPage />);
    expect(screen.queryByText('Se connecter')).toBeNull();
    expect(screen.getAllByTestId(OPENS, { includeHiddenElements: true })).toHaveLength(2);
    // Held against a row that truly answers nothing, on the same card and in the same type: whichever of the two
    // drifts, the pair stops differing and this fails. Naming a colour here would only repeat the theme.
    expect(styleOf(screen.getByText('Se déconnecter'))['color']).not.toBe(
      styleOf(screen.getByText('Abonné connecté'))['color'],
    );
  });

  /**
   * The two ways to reach the newsroom are handed to the phone, which is the only thing that can act on either: a
   * printed address is one a reader has to type out again somewhere else.
   */
  it('confie l’adresse et le numéro du journal au téléphone', async () => {
    await renderWithCache(<AccountPage />);
    await fireEvent.press(screen.getByText('relationlecteur@humanite.fr'));
    expect(jest.mocked(openExternal)).toHaveBeenCalledWith(NEWSROOM.mail);
    await fireEvent.press(screen.getByText('01 55 84 40 30'));
    expect(jest.mocked(openExternal)).toHaveBeenCalledWith(NEWSROOM.phone);
  });

  /** The screen says the reader is connected, rather than leaving them to infer it from a way out being offered. */
  it('dit que l’abonné est connecté, et ce que cela lui ouvre', async () => {
    withKey();
    await act(() => {
      useConnection.setState({ connection: 'in' });
    });
    await renderWithCache(<AccountPage />);
    expect(screen.getByText('Abonné connecté')).toBeTruthy();
    expect(screen.getByText('Les articles réservés à l’abonnement s’ouvrent.')).toBeTruthy();
  });

  /** A build that cannot receive the alerts draws no switch that would sign the phone up for nothing. */
  it('n’offre pas les alertes à une build qui ne les reçoit pas', async () => {
    await renderWithCache(<AccountPage />);
    expect(screen.queryByText('Alertes du journal')).toBeNull();
  });

  /** What turning the alerts on sends, and to whom, is read beside the switch, before the switch is touched. */
  it('abonne le téléphone aux alertes du journal quand on pousse l’interrupteur, en disant à qui', async () => {
    withAlerts();
    const subscribing = jest.spyOn(ALERTS, 'subscribe').mockResolvedValue(true);
    await renderWithCache(<AccountPage />);
    expect(screen.getByText(/s’inscrit auprès de OneSignal/u)).toBeTruthy();
    await fireEvent(screen.getByLabelText('Alertes du journal'), 'valueChange', true);
    expect(subscribing).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Alertes du journal').props['value']).toBe(true);
  });

  /**
   * A platform that refused asks the reader no more: the refusal is said where the promise was, and the phone's own
   * settings, the one place the answer can change, are a row away.
   */
  it('dit quand le téléphone refuse les alertes, et mène à ses réglages', async () => {
    withAlerts();
    jest.spyOn(ALERTS, 'subscribe').mockResolvedValue(false);
    await renderWithCache(<AccountPage />);
    await fireEvent(screen.getByLabelText('Alertes du journal'), 'valueChange', true);
    expect(screen.getByLabelText('Alertes du journal').props['value']).toBe(false);
    expect(screen.getByText(/empêche l’app d’afficher des alertes/u)).toBeTruthy();
    await fireEvent.press(screen.getByText('Ouvrir les réglages du téléphone'));
    expect(jest.mocked(openAppSettings)).toHaveBeenCalledTimes(1);
  });

  it('désabonne le téléphone quand on éteint les alertes', async () => {
    withAlerts();
    const unsubscribing = jest.spyOn(ALERTS, 'unsubscribe').mockResolvedValue(undefined);
    jest.spyOn(ALERTS, 'permitted').mockResolvedValue(true);
    await act(() => {
      useAlerts.setState({ wanted: true });
    });
    await renderWithCache(<AccountPage />);
    await fireEvent(screen.getByLabelText('Alertes du journal'), 'valueChange', false);
    expect(unsubscribing).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Alertes du journal').props['value']).toBe(false);
  });
});
