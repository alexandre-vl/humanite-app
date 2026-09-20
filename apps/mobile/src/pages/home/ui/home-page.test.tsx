import type { ArticleSummary, Section } from '@huma/contracts';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { content } from '#api';
import { useBookmarks } from '#features/bookmark';
import { StartupProvider } from '#lib/startup';
import { HomePage } from './home-page';

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

const show = async (band: string): Promise<void> => {
  await fireEvent.press(screen.getByText(band));
  await settle();
};

const firstArticle = async (): Promise<ArticleSummary> => {
  const [first] = (await content.getFeed({})).items;
  if (first === undefined) {
    throw new Error('le journal ne sert aucun article : le test ne vérifierait rien');
  }
  return first;
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
  await act(() => {
    useBookmarks.setState({ ids: [] });
  });
});

describe('HomePage', () => {
  it('sert le journal sous son fronton et ses deux bandes', async () => {
    const article = await firstArticle();
    const section = await firstSection();
    await renderPage();
    expect(await screen.findByText('Humanité')).toBeTruthy();
    expect(await screen.findByText(section.label)).toBeTruthy();
    expect(await screen.findByText(article.title)).toBeTruthy();
  });

  /**
   * An empty shelf of one's own is not an unpublished paper. The screen it copies says « Aucun article » and nothing
   * else, which its own reference marks as a fault: nothing there tells a reader how one gets an article onto it.
   */
  it('dit comment garder un article quand rien ne l’est, au lieu d’annoncer un journal vide', async () => {
    await renderPage();
    await show('Favoris');
    expect(await screen.findByText('Aucun article gardé')).toBeTruthy();
    expect(screen.getByText('Touchez le marque-page d’un article pour le retrouver ici.')).toBeTruthy();
    expect(screen.queryByText('Rien à lire pour l’instant')).toBeNull();
  });

  it('retire la barre des rubriques des favoris, qui n’appartiennent à aucune', async () => {
    const section = await firstSection();
    await renderPage();
    expect(await screen.findByText(section.label)).toBeTruthy();
    await show('Favoris');
    expect(screen.queryByText(section.label)).toBeNull();
  });

  it('garde un article depuis le fil, et le retrouve parmi les favoris', async () => {
    const article = await frontArticle();
    await renderPage();
    expect(await screen.findByText(article.title)).toBeTruthy();
    const [mark] = screen.getAllByLabelText('Ajouter aux favoris');
    if (mark === undefined) {
      throw new Error('aucune carte ne porte de marque-page : le test ne vérifierait rien');
    }
    await fireEvent.press(mark);
    await settle();
    await show('Favoris');
    expect(await screen.findByText(article.title)).toBeTruthy();
    expect(screen.queryByText('Aucun article gardé')).toBeNull();
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
