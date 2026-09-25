import type { ArticleSummary } from '@huma/contracts';
import { ContentApiError, instantOf, issueIdAt } from '@huma/contracts';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { screen, within } from '@testing-library/react-native';
import { content } from '#api';
import { useVisits } from '#features/last-visit';
import { t } from '#i18n';
import { formatDayHead } from '#lib/format';
import { pullDown, renderWithCache, settle } from '#lib/testing';
import { LivePage } from './live-page';

/** Whether the navigator shows the screen: En continu is the tab in front unless a test puts another there. */
let mockShown = true;

jest.mock('expo-router', () => ({ __esModule: true, router: { push: jest.fn() }, useIsFocused: () => mockShown }));

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

/** The titles of the items the wire says are new, as a reader listening hears them: the item, then « Nouveau ». */
const freshTitles = (order: readonly ArticleSummary[]): readonly string[] =>
  screen
    .queryAllByRole('link', { value: { text: t('live.fresh') } })
    .map((line) => order.find((item) => within(line).queryByText(item.title) !== null)?.title ?? '');

beforeEach(() => {
  mockShown = true;
  useVisits.setState({ seen: null });
});

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

  // Twice over: the list mounts the head of a run where the run begins, and again pinned at the top of its frame —
  // and says it once, the pinned copy being for the eye: on the iPhone simulator the day was read out twice.
  it('coiffe le fil de la journée que ses items portent, et l’y retient', async () => {
    const first = await newest();
    await renderPage();
    const day = formatDayHead(first.publishedAt, issueIdAt(instantOf(Date.now())));
    expect(await screen.findAllByText(day, { includeHiddenElements: true })).toHaveLength(2);
    expect(screen.getAllByText(day)).toHaveLength(1);
  });

  /** Read on the day its newest item came out, the wire opens under « Aujourd’hui »: the reader is at its top. */
  it('ouvre sous « Aujourd’hui » le jour où paraît ce qu’il a de plus récent', async () => {
    const first = await newest();
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse(first.publishedAt));
    await renderPage();
    expect(await screen.findAllByText('Aujourd\u2019hui', { includeHiddenElements: true })).toHaveLength(2);
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

  /**
   * The band narrowed the run to one section, which is the page of that section on Accueil under the same key: a
   * second door to pages the front already turns. The row it held is the wire's.
   */
  it('ne porte plus de bande de rubriques', async () => {
    const sections = await content.getSections();
    const first = await newest();
    await renderPage();
    await screen.findByText(first.title);
    for (const section of sections) {
      expect(screen.queryByText(section.label)).toBeNull();
    }
  });

  /**
   * Each item filed since the reader last looked says so of itself. The wire drew one line across the run instead,
   * under the words « Déjà paru à votre dernière visite », and a reader could not tell whether they spoke of the item
   * under them or of the whole run (25/09/2026).
   */
  it('dit nouveau chaque article paru depuis le dernier regard, et nul autre', async () => {
    const order = await merged();
    const [first, second, third] = order;
    if (first === undefined || second === undefined || third === undefined || second.publishedAt <= third.publishedAt) {
      throw new Error('le contenu ne sert pas trois articles d’heures distinctes : le test ne vérifierait rien');
    }
    useVisits.setState({ seen: third.publishedAt });
    await renderPage();
    await screen.findByText(first.title);
    expect(freshTitles(order)).toEqual([first.title, second.title]);
  });

  it('ne dit rien de nouveau à la première visite', async () => {
    const order = await merged();
    await renderPage();
    await screen.findByText(order[0]?.title ?? '');
    expect(freshTitles(order)).toEqual([]);
  });

  /** The mark stayed after the reader pulled the wire down, on 25/09/2026: pulling is looking afresh. */
  it('ne dit plus nouveau ce qu’il montrait une fois le fil tiré pour le relire', async () => {
    const order = await merged();
    const [first, , third] = order;
    if (first === undefined || third === undefined) {
      throw new Error('le contenu sert moins de trois articles : le test ne vérifierait rien');
    }
    useVisits.setState({ seen: third.publishedAt });
    await renderPage();
    await screen.findByText(first.title);
    expect(freshTitles(order)).not.toEqual([]);
    await pullDown(screen.getByText(first.title));
    await settle();
    expect(freshTitles(order)).toEqual([]);
  });

  /** The next visit draws its line under what this one showed: the newest item on the wire while it is on screen. */
  it('retient le plus récent article montré, pour la visite suivante', async () => {
    const first = await newest();
    await renderPage();
    await screen.findByText(first.title);
    expect(useVisits.getState().seen).toBe(first.publishedAt);
  });

  it('ne retient rien de ce qu’il a lu derrière un autre onglet', async () => {
    mockShown = false;
    const first = await newest();
    await renderPage();
    await screen.findByText(first.title);
    expect(useVisits.getState().seen).toBeNull();
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
