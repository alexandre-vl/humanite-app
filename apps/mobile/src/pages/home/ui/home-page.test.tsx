import type { ArticleSummary, Section } from '@huma/contracts';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { content } from '#api';
import { useBookmarks } from '#features/bookmark';
import { StartupProvider } from '#lib/startup';
import { HomePage } from './home-page';

// The double is built inside its own factory: jest hoists the call above everything else in the file, so a function
// declared outside would still be undefined when the screen first reaches for it.
jest.mock('expo-router', () => ({
  __esModule: true,
  router: { push: jest.fn() },
  useLocalSearchParams: (): Readonly<Record<string, string>> => ({}),
}));

/** One more turn, for what the screen asked on the turn before to reach it. */
const settle = async (): Promise<void> => {
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};

const renderPage = async (): Promise<void> => {
  await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })}>
      <StartupProvider>
        <HomePage />
      </StartupProvider>
    </QueryClientProvider>,
  );
  await settle();
};

/**
 * The article the front page opens on, worked out beside the code under test rather than by it: the first the feed
 * serves that carries a picture. The feed arrives newest first and a morning's newest items are briefs filed before
 * the desk has pictures, so this is not the first item — and a test that pressed the first mark on the screen while
 * naming the first item of the feed would be naming two different articles.
 */
const frontArticle = async (): Promise<ArticleSummary> => {
  const found = (await content.getFeed({})).items.find((item) => item.hero !== undefined);
  if (found === undefined) {
    throw new Error('le journal ne sert aucun article illustré : le test ne vérifierait rien');
  }
  return found;
};

const firstSection = async (): Promise<Section> => {
  const [first] = await content.getSections();
  if (first === undefined) {
    throw new Error('le journal ne sert aucune rubrique : le test ne vérifierait rien');
  }
  return first;
};

// The store outlives a test: it is one module, read by every screen that shows what the reader kept. The act is
// awaited — React 19 hands one back to be waited on, and one left unawaited holds its scope open over what follows.
beforeEach(async () => {
  jest.mocked(router.push).mockClear();
  await act(() => {
    useBookmarks.setState({ ids: [] });
  });
});

describe('HomePage', () => {
  it('sert le journal sous le nom du journal et la bande des rubriques', async () => {
    const article = await frontArticle();
    const section = await firstSection();
    await renderPage();
    expect(await screen.findByText('L’Humanité')).toBeTruthy();
    // All of them: the band names every section, and each card now names the one it ran in over its own title.
    expect(await screen.findAllByText(section.label)).not.toHaveLength(0);
    expect(await screen.findByText(article.title)).toBeTruthy();
  });

  /**
   * The two things a reader wants from anywhere in the paper and could reach from nowhere. They are in the masthead
   * and not in the feed, so they are there at the top of the paper and there again at the bottom of it.
   */
  it('offre depuis le fronton ce qu’on a gardé et la façon dont le journal est composé', async () => {
    await renderPage();
    await fireEvent.press(screen.getByLabelText('Mes lectures'));
    expect(jest.mocked(router.push)).toHaveBeenCalledWith('/bookmarks');
    await fireEvent.press(screen.getByLabelText('Préférences d’affichage'));
    expect(jest.mocked(router.push)).toHaveBeenCalledWith('/settings');
  });

  /** What the front page no longer holds: the shelf of what one kept, which is a screen of its own. */
  it('ne montre pas sur la une ce que le lecteur a gardé', async () => {
    await renderPage();
    expect(screen.queryByText('Aucun article gardé')).toBeNull();
    // The mark in the masthead opens the shelf; it does not show it, and nothing on this screen is that shelf.
    expect(screen.queryAllByText('Mes lectures')).toHaveLength(0);
  });

  it('annonce par son étiquette qu’un article gardé peut être rendu', async () => {
    const article = await frontArticle();
    await renderPage();
    expect(await screen.findByText(article.title)).toBeTruthy();
    const [mark] = screen.getAllByLabelText('Ajouter aux favoris');
    if (mark === undefined) {
      throw new Error('aucune carte ne porte de marque-page : le test ne vérifierait rien');
    }
    await fireEvent.press(mark);
    await settle();
    expect(screen.getAllByLabelText('Retirer des favoris')).toHaveLength(1);
  });
});
