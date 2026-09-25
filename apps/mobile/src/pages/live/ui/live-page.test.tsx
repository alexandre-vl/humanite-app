import type { ArticleSummary } from '@huma/contracts';
import { ContentApiError } from '@huma/contracts';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import { content } from '#api';
import { t } from '#i18n';
import { formatDayLabel } from '#lib/format';
import { renderWithCache, settle } from '#lib/testing';
import { LivePage } from './live-page';

const renderPage = async (): Promise<void> => {
  await renderWithCache(<LivePage />);
  await settle();
};

/** The first page of every section, merged and newest first — what the screen reads when nothing is filtered out. */
const merged = async (): Promise<readonly ArticleSummary[]> => {
  const sections = await content.getSections();
  const pages = await Promise.all(sections.map(async (section) => content.getFeed({ section: section.id })));
  const seen = new Map<string, ArticleSummary>();
  for (const item of pages.flatMap((page) => page.items)) {
    seen.set(item.id, item);
  }
  return [...seen.values()].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
};

/** The newest article of the whole paper, which the screen opens on whatever section filed it. */
const newest = async (): Promise<ArticleSummary> => {
  const [first] = await merged();
  if (first === undefined) {
    throw new Error('le contenu ne sert aucun article : le test ne vérifierait rien');
  }
  return first;
};

/** The first section of the menu, which the band offers straight after the whole paper. */
const firstSection = async () => {
  const [section] = await content.getSections();
  if (section === undefined) {
    throw new Error('le contenu ne sert aucune rubrique : le test ne vérifierait rien');
  }
  return section;
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('LivePage', () => {
  /**
   * The screen used to read the wire's own route and nothing else, which answers ten items and pages no further: two
   * and a half hours of one morning, measured on 25/09/2026. It reads every section together now and merges them.
   */
  it('ouvre sur l’article le plus récent du journal, toutes rubriques confondues', async () => {
    const first = await newest();
    await renderPage();
    expect(await screen.findByText(first.title)).toBeTruthy();
  });

  // Twice over: the list mounts the head of a run where the run begins, and again pinned at the top of its frame.
  it('coiffe le fil de la journée que ses items portent, et l’y retient', async () => {
    const first = await newest();
    await renderPage();
    expect(await screen.findAllByText(formatDayLabel(first.publishedAt))).toHaveLength(2);
  });

  /** The one claim this screen makes: nothing stands above something filed after it. */
  it('range les articles du plus récent au plus ancien, quelle que soit leur rubrique', async () => {
    const order = await merged();
    await renderPage();
    await screen.findByText(order[0]?.title ?? '');
    const drawn = order.filter((item) => screen.queryAllByText(item.title).length > 0);
    expect(drawn.length).toBeGreaterThan(1);
    expect(drawn.map((item) => item.publishedAt)).toEqual(
      [...drawn]
        .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
        .map((item) => item.publishedAt),
    );
  });

  /** An article is filed under one section, and the screen reads eleven lists: it may not print it eleven times. */
  it('ne montre jamais deux fois le même article', async () => {
    const order = await merged();
    await renderPage();
    await screen.findByText(order[0]?.title ?? '');
    for (const item of order.slice(0, 6)) {
      expect(screen.queryAllByText(item.title).length).toBeLessThanOrEqual(1);
    }
  });

  it('nomme dans sa bande le journal entier, puis chaque rubrique dans l’ordre du journal', async () => {
    const sections = await content.getSections();
    await renderPage();
    expect(await screen.findByText(t('live.whole'))).toBeTruthy();
    for (const section of sections) {
      expect(screen.getByText(section.label)).toBeTruthy();
    }
  });

  /**
   * The band filters and never leads anywhere: the run narrows under the reader rather than a screen being pushed
   * over them. So what proves it is that an article of another section has gone, not that anything was navigated to.
   */
  it('réduit le fil à une rubrique quand on presse son nom, sans quitter l’écran', async () => {
    const section = await firstSection();
    const its = new Set((await content.getFeed({ section: section.id })).items.map((item) => item.id));
    const other = (await merged()).find((item) => !its.has(item.id));
    if (other === undefined) {
      throw new Error('le contenu ne sert aucun article d’une autre rubrique : le test ne vérifierait rien');
    }
    await renderPage();
    await screen.findByText(other.title);
    await fireEvent.press(screen.getByText(section.label));
    await settle();
    expect(screen.queryByText(other.title)).toBeNull();
    expect(screen.getByText(t('live.whole'))).toBeTruthy();
  });

  /** What the reader is told of a paper that did not come is its cause, read off the failure the door raised. */
  it('dit pourquoi le journal n’est pas venu, et offre un nouvel essai qui peut aboutir', async () => {
    jest.spyOn(content, 'getFeed').mockRejectedValue(new ContentApiError('offline', 'hors ligne'));
    await renderPage();
    expect(await screen.findByText('Pas de connexion')).toBeTruthy();
    expect(screen.getByText(t('action.retry'))).toBeTruthy();
  });

  /** A headline cut is a headline lost, on the wire as on a card: the row cut its title at four lines. */
  it('ne coupe jamais le titre d’un item', async () => {
    const first = await newest();
    await renderPage();
    expect((await screen.findByText(first.title)).props['numberOfLines']).toBeUndefined();
  });

  /**
   * The day was printed twice: once on the band pinned over the run, and again on each of the dozen rows under it, as
   * `12/09, 19:52`. Nothing else this screen prints writes a day and a month as two numbers, so that is what the
   * second printing can be caught by.
   */
  it('n’écrit la date nulle part sous la journée qui la porte déjà', async () => {
    const first = await newest();
    await renderPage();
    await screen.findByText(first.title);
    expect(screen.queryByText(/\d{2}\/\d{2}/)).toBeNull();
  });
});
