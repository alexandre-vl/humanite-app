import type { ArticleSummary } from '@huma/contracts';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { content } from '#api';
import { useBookmarks } from '#features/bookmark';
import { StartupProvider } from '#lib/startup';
import { BookmarksPage } from './bookmarks-page';

// The double is built inside its own factory: jest hoists the call above everything else in the file, so a function
// declared outside would still be undefined when the screen first reaches for it.
jest.mock('expo-router', () => ({
  __esModule: true,
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: (): Readonly<Record<string, string>> => ({}),
}));

const settle = async (): Promise<void> => {
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};

const renderPage = async (): Promise<void> => {
  await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })}>
      <StartupProvider>
        <BookmarksPage />
      </StartupProvider>
    </QueryClientProvider>,
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
    useBookmarks.setState({ ids: [] });
  });
});

describe('BookmarksPage', () => {
  /**
   * An empty shelf of one's own is not an unpublished paper. The screen it copies says « Aucun article » and nothing
   * else, which its own reference marks as a fault: nothing there tells a reader how one gets an article onto it.
   */
  it('dit comment garder un article quand rien ne l’est, au lieu d’annoncer un journal vide', async () => {
    await renderPage();
    expect(await screen.findByText('Aucun article gardé')).toBeTruthy();
    expect(screen.getByText('Touchez le marque-page d’un article pour le retrouver ici.')).toBeTruthy();
    expect(screen.queryByText('Rien à lire pour l’instant')).toBeNull();
  });

  it('sert ce que le lecteur a gardé, sous le nom de l’écran', async () => {
    const article = await anArticle();
    await act(() => {
      useBookmarks.setState({ ids: [article.id] });
    });
    await renderPage();
    expect(screen.getByText('Mes lectures')).toBeTruthy();
    expect(await screen.findByText(article.title)).toBeTruthy();
    expect(screen.queryByText('Aucun article gardé')).toBeNull();
  });

  /** Rendering an article from here takes it off the shelf, and the shelf says so without being left. */
  it('rend un article depuis l’étagère, qui se vide sous le doigt', async () => {
    const article = await anArticle();
    await act(() => {
      useBookmarks.setState({ ids: [article.id] });
    });
    await renderPage();
    await fireEvent.press(await screen.findByLabelText('Retirer des favoris'));
    await settle();
    expect(await screen.findByText('Aucun article gardé')).toBeTruthy();
  });

  it('se quitte par la barre qui l’a nommé', async () => {
    await renderPage();
    await fireEvent.press(screen.getByLabelText('Revenir'));
    expect(jest.mocked(router.back)).toHaveBeenCalledTimes(1);
  });
});
