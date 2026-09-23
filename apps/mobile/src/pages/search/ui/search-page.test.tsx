import { QUESTION } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import { isRecord } from '@huma/unknown';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { content } from '#api';
import { t } from '#i18n';
import { nearestAbove, renderWithCache, settle } from '#lib/testing';
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
// update inside act, where React can account for it.
afterEach(settle);

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

  it('laisse le lecteur finir de taper avant d’interroger le journal', async () => {
    await renderPage();
    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER), 'jeunes');
    expect(screen.getByText('Cherchez dans le journal')).toBeTruthy();
    await afterTyping();
    expect(screen.queryByText('Cherchez dans le journal')).toBeNull();
    await settle();
  });

  it('sert les articles qu’une question atteint, sous la question qu’ils répondent', async () => {
    const found = await content.search({ text: QUESTION.parse('jeunes') });
    const [first] = found.items;
    if (first === undefined) {
      throw new Error('le corpus ne répond pas à cette question : le test ne vérifierait rien');
    }
    await renderPage();
    await type('jeunes');
    expect(await screen.findByText(first.title)).toBeTruthy();
    expect(screen.getByText('Résultats pour «\u00A0jeunes\u00A0»')).toBeTruthy();
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

  it('rend la question au lecteur quand il efface, et revient à ce qu’elle cherche', async () => {
    await renderPage();
    await type('jeunes');
    await fireEvent.press(screen.getByLabelText('Effacer la recherche'));
    await afterTyping();
    expect(screen.getByText('Cherchez dans le journal')).toBeTruthy();
    await settle();
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
