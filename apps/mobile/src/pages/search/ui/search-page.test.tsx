import type { ArticleSummary } from '@huma/contracts';
import { ContentApiError, QUESTION } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import { isRecord } from '@huma/unknown';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, renderHook, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { content } from '#api';
import { t } from '#i18n';
import { useTheme } from '#lib/styles';
import { nearestAbove, renderWithCache, scrollViewAbove, settle, styleOf } from '#lib/testing';
import type { Rendered } from '#lib/testing';
import { ICONS } from '#primitives/icon';
import { dismissKeyboard } from '#primitives/text-field';
import { SETTLE } from '../model/debounced';
import { SearchPage } from './search-page';

// The double is built inside the factory: jest hoists the call above everything else in the file, so anything it read
// from outside would still be undefined when the screen first asks for the router.
jest.mock('expo-router', () => ({ __esModule: true, router: { push: jest.fn() } }));

// The keyboard is the native layer's, and no runner has one: the field stays real, and the one call the screen makes
// to put the keyboard away is counted instead.
jest.mock('#primitives/text-field', () => ({
  __esModule: true,
  ...jest.requireActual<Readonly<Record<string, unknown>>>('#primitives/text-field'),
  dismissKeyboard: jest.fn(),
}));

const PLACEHOLDER = t('search.placeholder');

/** Just past the screen's own wait for the typing to settle, which is when what was typed becomes a question. */
const afterTyping = async (): Promise<void> => {
  await act(async () => new Promise((resolve) => setTimeout(resolve, SETTLE + 1)));
};

const renderPage = async (): Promise<void> => {
  await renderWithCache(<SearchPage />);
};

/**
 * Types into the field and lets the screen settle. Two turns are needed, not one: the first runs past the wait the
 * field keeps before asking anything, and the answer only reaches the screen on the next one. Measured — with a single
 * turn every assertion below about what is *not* on screen passed whether the screen had asked or not, which is to say
 * it held nothing at all.
 */
const type = async (text: string): Promise<void> => {
  await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER), text);
  await afterTyping();
  await settle();
};

// A list unmounted between two tests finishes its own work on the next turn: letting that turn run here keeps the
// update inside act, where React can account for it. A search held unanswered by one test is let go before the next.
afterEach(async () => {
  jest.restoreAllMocks();
  await settle();
});

/**
 * Whether a style is one record with a width. A list of layers is passed over on purpose: the icon's stand-in lays
 * out a layer for the size it was handed, and that width is the glyph's own, not the side of the box a finger lands
 * on.
 */
const hasSide = (value: unknown): value is Readonly<{ width: number }> =>
  isRecord(value) && typeof value['width'] === 'number';

/** The side a mark is drawn at, read from the nearest box around its glyph that is given one. */
const sideOf = (glyph: Rendered): number =>
  nearestAbove(
    glyph,
    (node) => {
      const style: unknown = node.props['style'];
      return hasSide(style) ? style.width : undefined;
    },
    'rien autour du signe ne dit sa taille : le test ne vérifierait pas la cible',
  );

/** What the rule under the field says to a reader listening to the screen, while the journal is looking. */
const ASKING = t('search.asking');

/**
 * An article the journal answers `text` with whose title or standfirst — the words a card prints, and the only ones
 * the app matches on its own — hold `word`: once that answer is read, the app can answer `word` by itself.
 */
const readFor = async (text: string, word: RegExp): Promise<ArticleSummary> => {
  const found = (await content.search({ text: QUESTION.parse(text) })).items.find((item) =>
    word.test(`${item.title} ${item.standfirst ?? ''}`),
  );
  if (found === undefined) {
    throw new Error(`aucune carte de la réponse à « ${text} » ne porte ce mot : le test ne vérifierait rien`);
  }
  return found;
};

describe('SearchPage', () => {
  /**
   * A single letter reaches all 72 articles of the corpus, so a screen that asked would answer with the whole paper.
   * Nothing is asked and nothing is counted: the count only appears once something has come back.
   */
  it('dit ce qu’elle cherche tant qu’on ne lui a rien demandé, au lieu de rester nue', async () => {
    await renderPage();
    expect(screen.getByText('Cherchez dans le journal')).toBeTruthy();
    await type('c');
    expect(screen.getByText('Cherchez dans le journal')).toBeTruthy();
    expect(screen.queryByText(/Résultats pour/u)).toBeNull();
  });

  /**
   * The cross is a sixteen-point mark, and it was the whole of its target: 42 pixels of an A065 under a thumb that
   * wants 126. What it answers past its own edges gives the finger back its grid step.
   */
  it('donne à la croix qui efface un pas de grille entier sous le doigt', async () => {
    await renderPage();
    await type('jeunes');
    const cross = screen.getByLabelText(t('search.clear'));
    const reach: unknown = cross.props['hitSlop'];
    const glyph = within(cross).getByTestId(`symbol:${ICONS.clear.android}`, { includeHiddenElements: true });
    expect(sideOf(glyph) + 2 * (typeof reach === 'number' ? reach : 0)).toBeGreaterThanOrEqual(SPACING.xxxl);
  });

  /**
   * The line the question is typed on is a grid step tall, and the field was only as tall as its letters: set at
   * twenty points, they were the whole of the target (iPhone simulator, 25/09/2026). The field fills its line, and
   * the line keeps no room of its own above or below it, which would be room a thumb lands on and types nothing.
   */
  it('donne au champ toute la hauteur de sa ligne sous le doigt', async () => {
    await renderPage();
    const field = screen.getByPlaceholderText(PLACEHOLDER);
    expect(styleOf(field)['alignSelf']).toBe('stretch');
    const line = nearestAbove(
      field,
      (node) => {
        const style = styleOf(node);
        return typeof style['minHeight'] === 'number' ? style : undefined;
      },
      'rien autour du champ ne dit la hauteur de sa ligne : le test ne vérifierait pas la cible',
    );
    expect(line['minHeight']).toBeGreaterThanOrEqual(SPACING.xxxl);
    for (const side of ['padding', 'paddingVertical', 'paddingTop', 'paddingBottom']) {
      expect(line[side] ?? SPACING.none).toBe(SPACING.none);
    }
  });

  it('laisse le lecteur finir de taper avant d’interroger le journal', async () => {
    await renderPage();
    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER), 'jeunes');
    expect(screen.getByText('Cherchez dans le journal')).toBeTruthy();
    await afterTyping();
    expect(screen.queryByText('Cherchez dans le journal')).toBeNull();
    await settle();
  });

  it('sert les articles qu’une question atteint, et rien au-dessus d’eux', async () => {
    const found = await content.search({ text: QUESTION.parse('jeunes') });
    const [first] = found.items;
    if (first === undefined) {
      throw new Error('le corpus ne répond pas à cette question : le test ne vérifierait rien');
    }
    await renderPage();
    await type('jeunes');
    expect(await screen.findByText(first.title)).toBeTruthy();
    // Three headings named three kinds of answer on this screen, and a reader had to read them before the paper.
    // The rule under the field says the one thing there is to say, and says it without words.
    expect(screen.queryByText(/Résultats pour|Déjà lu/u)).toBeNull();
    await settle();
  });

  /**
   * A feed that kept its previous answer while the next was fetched put one question's articles under another's
   * question, for the second and a half the journal's search takes. What a reader sees answers what the field holds,
   * or nothing at all.
   */
  it('ne laisse pas la réponse d’une question que le lecteur a déjà remplacée', async () => {
    const found = await content.search({ text: QUESTION.parse('jeunes') });
    const [first] = found.items;
    if (first === undefined) {
      throw new Error('le corpus ne répond pas à cette question : le test ne vérifierait rien');
    }
    await renderPage();
    await type('jeunes');
    expect(await screen.findByText(first.title)).toBeTruthy();
    await type('zzzz');
    expect(screen.queryByText(first.title)).toBeNull();
    await settle();
  });

  it('trouve un article accentué à partir de ce qu’un lecteur tape sans accent', async () => {
    const found = await content.search({ text: QUESTION.parse('école') });
    const [first] = found.items;
    if (first === undefined) {
      throw new Error('le corpus ne porte aucun article sur ce sujet : le test ne vérifierait rien');
    }
    await renderPage();
    await type('ecole');
    expect(await screen.findByText(first.title)).toBeTruthy();
    await settle();
  });

  it('nomme la question à laquelle rien ne répond, plutôt que d’annoncer un journal vide', async () => {
    await renderPage();
    await type('zzzz');
    expect(await screen.findByText('Aucun résultat pour «\u00A0zzzz\u00A0»')).toBeTruthy();
    expect(screen.queryByText('Rien à lire pour l’instant')).toBeNull();
    await settle();
  });

  /**
   * The line is answered at once when it is emptied: the pause is there for a word being typed, and a line just
   * emptied is not being typed in. Waited out, it left the last answer under an empty field.
   */
  it('revient à ce qu’elle cherche dès que le lecteur efface, sans attendre', async () => {
    await renderPage();
    await type('jeunes');
    await fireEvent.press(screen.getByLabelText('Effacer la recherche'));
    expect(screen.getByText('Cherchez dans le journal')).toBeTruthy();
    await settle();
  });

  /**
   * An emptied line is taken at once, and for good. Typed into again before the pause was out, it answered the new
   * question with the old one's answer until the typing stopped.
   */
  it('ne rend pas à la question suivante la réponse d’une question effacée', async () => {
    const [first] = (await content.search({ text: QUESTION.parse('jeunes') })).items;
    if (first === undefined) {
      throw new Error('le corpus ne répond pas à cette question : le test ne vérifierait rien');
    }
    await renderPage();
    await type('jeunes');
    expect(await screen.findByText(first.title)).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER), '');
    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER), 'zz');
    expect(screen.queryByText(first.title)).toBeNull();
    expect(screen.getByText('Cherchez dans le journal')).toBeTruthy();
    await afterTyping();
    await settle();
  });

  /**
   * One list for each answer. A list kept from one question to the next kept how far down the reader had scrolled,
   * and the next answer opened as far down — past its own end, on a blank page, when it was shorter.
   */
  it('ouvre chaque réponse dans une liste à elle, prise à son début', async () => {
    const titleOf = async (text: string): Promise<string> => {
      const [first] = (await content.search({ text: QUESTION.parse(text) })).items;
      if (first === undefined) {
        throw new Error(`le corpus ne répond pas à « ${text} » : le test ne vérifierait rien`);
      }
      return first.title;
    };
    const [one, other] = await Promise.all([titleOf('jeunes'), titleOf('ecole')]);
    await renderPage();
    await type('jeunes');
    const first = scrollViewAbove(await screen.findByText(one), 'la réponse n’est dans aucune liste');
    await type('ecole');
    expect(scrollViewAbove(await screen.findByText(other), 'la réponse n’est dans aucune liste')).not.toBe(first);
    await settle();
  });

  /**
   * While the journal looks and the app has read nothing that answers, cards stand where the answer will be. The
   * screen was meant to show nothing there, drew them too faint to be seen, and a reader saw a blank page.
   */
  it('dresse des cartes à la place de la réponse tant que le journal cherche', async () => {
    jest.spyOn(content, 'search').mockReturnValue(new Promise(() => undefined));
    const grey = (await renderHook(() => useTheme())).result.current.standIn;
    await renderPage();
    await type('jeunes');
    const ghost = (screen.root?.queryAll(() => true) ?? []).filter((node) => styleOf(node)['backgroundColor'] === grey);
    expect(ghost.length).toBeGreaterThan(5);
  });

  /**
   * The rule is the only thing on the screen that says what is listed is not the journal's answer yet, and it said it
   * to the eye alone: a reader listening to the screen heard articles read out as the answer to their question.
   */
  it('dit à qui écoute l’écran que le journal cherche, tant qu’il cherche', async () => {
    await renderPage();
    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER), 'jeunes');
    expect(screen.queryByLabelText(ASKING)).toBeNull();
    await afterTyping();
    expect(screen.getByLabelText(ASKING)).toBeTruthy();
    await settle();
    expect(screen.queryByLabelText(ASKING)).toBeNull();
  });

  /**
   * What the app finds by itself stands in while the journal looks. When the journal found nothing, the looking is
   * over all the same: the rule went on saying « still looking » for good, over articles that were by then the whole
   * of the answer, and the list under it was never taken back — so it stays, as the answer it has become.
   */
  it('cesse de chercher quand le journal ne trouve rien, et garde ce que l’app avait trouvé', async () => {
    const known = await readFor('jeunes', /\bjeune/iu);
    await renderPage();
    await type('jeunes');
    expect(await screen.findByText(known.title)).toBeTruthy();
    jest.spyOn(content, 'search').mockResolvedValue({ items: [], nextCursor: null });
    await type('jeune');
    expect(screen.getByText(known.title)).toBeTruthy();
    expect(screen.queryByLabelText(ASKING)).toBeNull();
    expect(screen.queryByText(t('search.none.title', { query: 'jeune' }))).toBeNull();
  });

  /**
   * A journal that cannot be reached is not one still looking. The failure went unsaid under what the app had found,
   * and the rule went on saying « still looking » for good: it is said now by its cause, under the articles the app
   * found, with the try again that asks the journal once more.
   */
  it('dit pourquoi le journal n’a pas répondu, sous ce que l’app avait trouvé, et offre de le redemander', async () => {
    const known = await readFor('jeunes', /\bjeune/iu);
    await renderPage();
    await type('jeunes');
    expect(await screen.findByText(known.title)).toBeTruthy();
    const asking = jest.spyOn(content, 'search').mockRejectedValue(new ContentApiError('offline', 'hors ligne'));
    await type('jeune');
    expect(await screen.findByText(t('failure.offline.title'))).toBeTruthy();
    expect(screen.getByText(known.title)).toBeTruthy();
    expect(screen.queryByLabelText(ASKING)).toBeNull();
    const before = asking.mock.calls.length;
    await fireEvent.press(screen.getByText(t('action.retry')));
    await settle();
    expect(asking.mock.calls.length).toBeGreaterThan(before);
  });

  /**
   * The answer opens on the first press, keyboard up or not (the list lets the press through), and the keyboard goes
   * with the question: an article opened under it would be read through half a screen.
   */
  it('ouvre l’article pressé sur sa propre route, clavier rangé', async () => {
    const [first] = (await content.search({ text: QUESTION.parse('jeunes') })).items;
    if (first === undefined) {
      throw new Error('le corpus ne répond pas à cette question : le test ne vérifierait rien');
    }
    await renderPage();
    await type('jeunes');
    await fireEvent.press(await screen.findByText(first.title));
    expect(jest.mocked(router.push)).toHaveBeenCalledWith({ pathname: '/article/[id]', params: { id: first.id } });
    expect(jest.mocked(dismissKeyboard)).toHaveBeenCalledTimes(1);
    await settle();
  });
});
