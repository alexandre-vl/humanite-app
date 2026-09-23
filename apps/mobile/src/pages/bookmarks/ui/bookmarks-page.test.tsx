import type { ArticleSummary } from '@huma/contracts';
import { typographyAt } from '@huma/design-tokens';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { content } from '#api';
import { useBookmarks } from '#features/bookmark';
import { StartupProvider } from '#lib/startup';
import { renderWithCache, settle, styleOf } from '#lib/testing';
import { BookmarksPage } from './bookmarks-page';

// The double is built inside its own factory: jest hoists the call above everything else in the file, so a function
// declared outside would still be undefined when the screen first reaches for it.
jest.mock('expo-router', () => ({
  __esModule: true,
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: (): Readonly<Record<string, string>> => ({}),
}));

const renderPage = async (): Promise<void> => {
  await renderWithCache(
    <StartupProvider>
      <BookmarksPage />
    </StartupProvider>,
  );
  await settle();
};

const anArticle = async (): Promise<ArticleSummary> => {
  const [first] = (await content.getFeed({})).items;
  if (first === undefined) {
    throw new Error('le journal ne sert aucun article : le test ne vérifierait rien');
  }
  return first;
};

beforeEach(async () => {
  jest.mocked(router.back).mockClear();
  await act(() => {
    useBookmarks.setState({ kept: [] });
  });
});

describe('BookmarksPage', () => {
  /**
   * An empty shelf of one's own is not an unpublished paper. The screen it copies says « Aucun article » and nothing
   * else, which its own reference marks as a fault: nothing there tells a reader how one gets an article onto it.
   */
  it('dit comment garder un article quand rien ne l’est, au lieu d’annoncer un journal vide', async () => {
    await renderPage();
    expect(await screen.findByText('Aucune lecture pour l’instant')).toBeTruthy();
    expect(screen.getByText('Touchez le marque-page d’un article pour l’ajouter à vos lectures.')).toBeTruthy();
    expect(screen.queryByText('Rien à lire pour l’instant')).toBeNull();
  });

  it('sert ce que le lecteur a gardé, sous le nom de l’écran', async () => {
    const article = await anArticle();
    await act(() => {
      useBookmarks.setState({ kept: [article] });
    });
    await renderPage();
    expect(screen.getByText('Mes lectures')).toBeTruthy();
    expect(await screen.findByText(article.title)).toBeTruthy();
    expect(screen.queryByText('Aucune lecture pour l’instant')).toBeNull();
  });

  /** Rendering an article from here takes it off the shelf, and the shelf says so without being left. */
  it('rend un article depuis l’étagère, qui se vide sous le doigt', async () => {
    const article = await anArticle();
    await act(() => {
      useBookmarks.setState({ kept: [article] });
    });
    await renderPage();
    await fireEvent.press(await screen.findByLabelText('Retirer de mes lectures'));
    await settle();
    expect(await screen.findByText('Aucune lecture pour l’instant')).toBeTruthy();
  });

  /**
   * The two tabs that have nothing better to print at the top than their own name print it the same way: the display
   * type, on the page, where the account screen prints its own. It was set here in a bar across the top, centred and
   * four points smaller — the shape a pushed screen takes, where the name shares its row with the way back out.
   *
   * The size is read from the table rather than written as a number, that table being where a variant is what it is.
   */
  it('se nomme dans le type dont le compte se nomme, et pas dans celui d’une barre', async () => {
    await renderPage();
    const size = styleOf(screen.getByText('Mes lectures'))['fontSize'];
    expect(size).toBe(typographyAt('display', 'normal', 'paper').size);
    expect(size).not.toBe(typographyAt('label', 'normal', 'paper').size);
  });

  /**
   * Nothing pushes this screen any more — it is a tab, left by choosing another — so it carries no way back. A screen
   * that offered one would offer to leave a screen nothing had entered.
   */
  it('n’offre pas de retour, rien ne l’ayant empilé', async () => {
    await renderPage();
    expect(screen.queryByLabelText('Revenir')).toBeNull();
  });
});
