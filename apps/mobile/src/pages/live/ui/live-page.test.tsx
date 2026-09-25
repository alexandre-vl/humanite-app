import type { ArticleSummary } from '@huma/contracts';
import { ContentApiError } from '@huma/contracts';
import { isList, isRecord } from '@huma/unknown';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { screen } from '@testing-library/react-native';
import { content } from '#api';
import { useVisits } from '#features/last-visit';
import { t } from '#i18n';
import { formatDayLabel } from '#lib/format';
import { renderWithCache, settle } from '#lib/testing';
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

/** Every word the screen prints, in the order it prints them — which is the order a reader meets them in. */
const wordsInOrder = (): readonly string[] => {
  const seen: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      seen.push(node);
    } else if (isList(node)) {
      for (const child of node) {
        walk(child);
      }
    } else if (isRecord(node)) {
      walk(node['children']);
    }
  };
  walk(screen.toJSON());
  return seen;
};

beforeEach(() => {
  mockShown = true;
  useVisits.setState({ seen: null, since: null, leftAt: null });
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
    const day = formatDayLabel(first.publishedAt);
    expect(await screen.findAllByText(day, { includeHiddenElements: true })).toHaveLength(2);
    expect(screen.getAllByText(day)).toHaveLength(1);
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

  /** What came out since the last visit stands over the line, and what was already out stands under it. */
  it('trace la ligne de la dernière visite sous ce qui est paru depuis', async () => {
    const order = await merged();
    const [first, , third] = order;
    const since = order[2];
    if (first === undefined || third === undefined || since === undefined) {
      throw new Error('le contenu sert moins de trois articles : le test ne vérifierait rien');
    }
    useVisits.setState({ seen: since.publishedAt, since: since.publishedAt });
    await renderPage();
    await screen.findByText(first.title);
    const words = wordsInOrder();
    const line = words.indexOf(t('live.visit'));
    expect(line).toBeGreaterThan(words.indexOf(first.title));
    expect(line).toBeLessThan(words.indexOf(third.title));
  });

  it('ne trace aucune ligne à la première visite', async () => {
    const first = await newest();
    await renderPage();
    await screen.findByText(first.title);
    expect(screen.queryByText(t('live.visit'))).toBeNull();
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
