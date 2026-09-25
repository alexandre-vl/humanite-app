import type { ArticleSummary, Section } from '@huma/contracts';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { content } from '#api';
import { useBookmarks } from '#features/bookmark';
import { useVisits } from '#features/last-visit';
import { StartupProvider } from '#lib/startup';
import { actionNamed, perform, renderWithCache, settle } from '#lib/testing';
import { HomePage } from './home-page';

// The double is built inside its own factory: jest hoists the call above everything else in the file, so a function
// declared outside would still be undefined when the screen first reaches for it.
jest.mock('expo-router', () => ({
  __esModule: true,
  router: { push: jest.fn(), navigate: jest.fn() },
  useLocalSearchParams: (): Readonly<Record<string, string>> => ({}),
}));

const renderPage = async (): Promise<void> => {
  await renderWithCache(
    <StartupProvider>
      <HomePage />
    </StartupProvider>,
  );
  // Twice: the sections answer on the first turn and the feed of each page mounted answers on the next, so a screen
  // settled once is a screen still finishing while the test reads it.
  await settle();
  await settle();
};

/**
 * The article the front page opens on, worked out beside the code under test rather than by it: the first the feed
 * serves, a feed laying its items out in the order its source gives them — so the first mark on the screen is this
 * article's, with or without a picture.
 */
const frontArticle = async (): Promise<ArticleSummary> => {
  const [first] = (await content.getFeed({})).items;
  if (first === undefined) {
    throw new Error('le journal ne sert aucun article : le test ne vérifierait rien');
  }
  return first;
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
  jest.mocked(router.navigate).mockClear();
  await act(() => {
    useBookmarks.setState({ kept: [] });
    useVisits.setState({ seen: null });
  });
});

/** The paper in the order the newsroom filed it, as the wire merges it: every section's first page, each once. */
const merged = async (): Promise<readonly ArticleSummary[]> => {
  const sections = await content.getSections();
  const pages = await Promise.all(sections.map(async (section) => content.getFeed({ section: section.id })));
  const once = new Map<string, ArticleSummary>();
  for (const item of pages.flatMap((page) => page.items)) {
    once.set(item.id, item);
  }
  return [...once.values()].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
};

describe('HomePage', () => {
  it('sert le journal sous le nom du journal et la bande des rubriques', async () => {
    const article = await frontArticle();
    const section = await firstSection();
    await renderPage();
    expect(await screen.findByText('L’Humanité')).toBeTruthy();
    // The band names every section.
    expect(await screen.findAllByText(section.label)).not.toHaveLength(0);
    expect(await screen.findByText(article.title)).toBeTruthy();
  });

  /**
   * One control, where there were two. The other opened what the reader kept, and it was here because that shelf was
   * reachable from nowhere else; it has a tab now, standing directly under this bar, so the mark was a second door.
   */
  it('offre depuis le fronton la façon dont le journal est composé, et rien d’autre', async () => {
    await renderPage();
    await fireEvent.press(screen.getByLabelText('Préférences d’affichage'));
    expect(jest.mocked(router.push)).toHaveBeenCalledWith('/settings');
    expect(screen.queryByLabelText('Mes lectures')).toBeNull();
  });

  /** What the front page no longer holds: the shelf of what one kept, which is a screen of its own. */
  it('ne montre pas sur la une ce que le lecteur a gardé', async () => {
    await renderPage();
    expect(screen.queryByText('Aucune lecture pour l’instant')).toBeNull();
    // The tab bar names the shelf and is not drawn here; nothing on this screen is that shelf, nor names it.
    expect(screen.queryAllByText('Mes lectures')).toHaveLength(0);
  });

  /**
   * A section is a page of this screen now, not a screen pushed over it. What the band reports is which page is in
   * hand; which pages that mounts is the pager's own promise, held beside the pager.
   */
  it('tourne à la rubrique qu’on nomme dans la bande, et le dit sur la bande', async () => {
    await renderPage();
    const [front, first] = screen.getAllByRole('radio');
    if (front === undefined || first === undefined) {
      throw new Error('la bande ne nomme pas la une et une rubrique : le test ne vérifierait rien');
    }
    expect(front.props['accessibilityState']).toEqual({ selected: true });
    await fireEvent.press(first);
    await settle();
    const [turnedFront, turnedFirst] = screen.getAllByRole('radio');
    expect(turnedFront?.props['accessibilityState']).toEqual({ selected: false });
    expect(turnedFirst?.props['accessibilityState']).toEqual({ selected: true });
    // The masthead has not moved: turning a section turns a page of this screen, it does not open another.
    expect(screen.getByText('L’Humanité')).toBeTruthy();
  });

  /**
   * A reader listening lands on the card, which reads out everything drawn on it: the bookmark was part of its name
   * and nothing let them press it. The card now offers it as an action, under the bookmark's own name.
   */
  it('offre, depuis la carte, de garder un article puis de le rendre', async () => {
    const article = await frontArticle();
    await renderPage();
    expect(await screen.findByText(article.title)).toBeTruthy();
    const offering = (label: string) =>
      screen.getAllByRole('link').filter((card) => actionNamed(card, label) !== undefined);
    const [card] = offering('Ajouter à mes lectures');
    if (card === undefined) {
      throw new Error('aucune carte n’offre de garder son article : le test ne vérifierait rien');
    }
    await perform(card, 'Ajouter à mes lectures');
    await settle();
    expect(offering('Retirer de mes lectures')).toHaveLength(1);
  });

  /**
   * The wire had shown the reader up to its third article: the front says how many came out since, where a reader
   * opens the paper, and takes them to the wire.
   */
  it('dit sur la une ce que le fil n’a pas encore montré, et y mène', async () => {
    const order = await merged();
    const shown = order[2];
    if (shown === undefined) {
      throw new Error('le contenu sert moins de trois articles : le test ne vérifierait rien');
    }
    const count = order.filter((item) => item.publishedAt > shown.publishedAt).length;
    const words =
      count > 1 ? `${String(count)} nouveaux articles en continu` : `${String(count)} nouvel article en continu`;
    await act(() => {
      useVisits.setState({ seen: shown.publishedAt });
    });
    await renderPage();
    // The front alone says it: a section's page is one section, and the wire is the whole paper.
    expect(await screen.findAllByRole('link', { name: words })).toHaveLength(1);
    await fireEvent.press(screen.getByRole('link', { name: words }));
    expect(jest.mocked(router.navigate)).toHaveBeenCalledWith('/live');
  });

  /** On a first visit everything is new, and a count of the whole paper tells a reader nothing. */
  it('ne dit rien du fil à la première visite', async () => {
    await renderPage();
    expect(screen.queryByText(/en continu$/u)).toBeNull();
  });
});
