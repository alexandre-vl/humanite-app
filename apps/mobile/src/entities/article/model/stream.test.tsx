import type { ArticleSummary, FeedQuery, Instant, Page, SectionId } from '@huma/contracts';
import { ARTICLE_ID, ContentApiError, instantAt, instantOf, SECTION_ID, SERVICE_PAGES } from '@huma/contracts';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { focusManager } from '@tanstack/react-query';
import { act, waitFor } from '@testing-library/react-native';
import { content } from '#api';
import { everyArticle, renderHookWithCache } from '#lib/testing';
import { useArticleStream } from './stream';

/** A Paris hour as the newsroom writes one, read as the instant it names. */
const paris = (stamp: string): Instant => {
  const instant = instantAt(stamp);
  if (instant === null) {
    throw new Error(`aucun instant ne s’écrit ${stamp}`);
  }
  return instant;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** The last item filed, at the top of every section's first page. */
const NEWEST = paris('2026-09-25 18:00');

/**
 * Three sections the way the journal's service runs them: one filed every hour, one every three hours, one every five
 * days — so a page of thirty reaches back a day and a quarter, three days and a half, and five months. The corpus the
 * app is built on holds no section of more than one page, so it could not show a second step at all.
 */
const HARD = SECTION_ID.parse('politique');
const STEADY = SECTION_ID.parse('monde');
const RARE = SECTION_ID.parse('histoire');
const SECTIONS: readonly SectionId[] = [HARD, STEADY, RARE];
const PACES = new Map<SectionId, readonly [count: number, every: number]>([
  [HARD, [90, HOUR]],
  [STEADY, [60, 3 * HOUR]],
  [RARE, [60, 5 * DAY]],
]);

/**
 * Each section's items, newest first, filed again at the section's pace from the corpus's own summaries: the corpus
 * holds seventy-two, so each is used more than once, under a number of its own as the service numbers its items.
 */
const filed = async (): Promise<ReadonlyMap<SectionId, readonly ArticleSummary[]>> => {
  const pool = await everyArticle(content);
  const lists = new Map<SectionId, readonly ArticleSummary[]>();
  let numbered = 0;
  for (const section of SECTIONS) {
    const [count, every] = PACES.get(section) ?? [0, HOUR];
    const items: ArticleSummary[] = [];
    for (let index = 0; index < count; index += 1) {
      const template = pool[numbered % pool.length];
      if (template === undefined) {
        throw new Error('le corpus ne sert aucun article : le test ne vérifierait rien');
      }
      numbered += 1;
      items.push({
        ...template,
        id: ARTICLE_ID.parse(String(3_000_000 + numbered)),
        publishedAt: instantOf(Date.parse(NEWEST) - index * every),
      });
    }
    lists.set(section, items);
  }
  return lists;
};

/** A section's page as the service pages it: thirty items from the offset the cursor names. */
const pageOf = (items: readonly ArticleSummary[], query: FeedQuery): Page<ArticleSummary> => {
  const offset = query.cursor === undefined ? 0 : Number(query.cursor);
  const next = offset + SERVICE_PAGES.section;
  return { items: items.slice(offset, next), nextCursor: next < items.length ? String(next) : null };
};

/** A reading that never answers: a step caught on its way. */
const never = async (): Promise<Page<ArticleSummary>> => new Promise(() => undefined);

let lists: ReadonlyMap<SectionId, readonly ArticleSummary[]> = new Map();

/** The service's reading of a section's list, over the three sections above. */
const served = async (query: FeedQuery): Promise<Page<ArticleSummary>> =>
  Promise.resolve(pageOf(query.section === undefined ? [] : (lists.get(query.section) ?? []), query));

beforeEach(async () => {
  lists = await filed();
  jest.spyOn(content, 'getFeed').mockImplementation(served);
  jest.spyOn(content, 'getLiveFeed').mockResolvedValue({ items: [], nextCursor: null });
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** Runs the stream and waits for its first step to land. */
const firstStepRead = async () => {
  const rendered = await renderHookWithCache(() => useArticleStream(SECTIONS));
  await waitFor(() => {
    expect(rendered.result.current.items.length).toBeGreaterThan(0);
  });
  return rendered;
};

/** Asks for the next step, as the list does when its end comes near. */
const reachEnd = async (onEndReached: (() => void) | undefined): Promise<void> => {
  await act(async () => {
    onEndReached?.();
    await Promise.resolve();
  });
};

describe('useArticleStream', () => {
  /**
   * Every page the wire holds is read again when the app comes back to the front with them stale, and the platform's
   * spinner turned at the top of the wire the whole time, for a reader who had pulled nothing (25/09/2026).
   */
  it('ne fait tourner l’indicateur que pour la relecture que le lecteur a demandée', async () => {
    const { result } = await firstStepRead();
    jest.mocked(content.getFeed).mockImplementation(never);
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(jest.mocked(content.getFeed).mock.calls.length).toBeGreaterThan(SECTIONS.length);
    expect(result.current.refreshing).toBe(false);
    focusManager.setFocused(undefined);
    await act(async () => {
      result.current.readAgain();
      await Promise.resolve();
    });
    expect(result.current.refreshing).toBe(true);
  });

  it('lit au premier pas la première page de chaque rubrique, et la route du fil avec elles', async () => {
    await firstStepRead();
    expect(content.getLiveFeed).toHaveBeenCalledTimes(1);
    expect(jest.mocked(content.getFeed).mock.calls.map(([query]) => query)).toEqual(
      SECTIONS.map((section) => ({ section })),
    );
  });

  /**
   * Down to the floor and not an item further: below the hour the hourly section's first page stops at, the others
   * might yet hold something, and an order drawn there would be rewritten by the next step under the reader's eyes.
   */
  it('ne rend que ce que la fusion garantit, du plus récent au plus ancien', async () => {
    const { result } = await firstStepRead();
    const drawn = result.current.items.map((item) => item.publishedAt);
    const floor = instantOf(Date.parse(NEWEST) - 29 * HOUR);
    // Thirty of the hourly section, ten of the three-hourly one down to that hour, and the rare one's newest.
    expect(drawn).toHaveLength(30 + 10 + 1);
    expect(drawn.every((instant) => instant >= floor)).toBe(true);
    expect(drawn).toEqual([...drawn].sort((left, right) => right.localeCompare(left)));
  });

  /**
   * The eleven went one page deeper together, and the second step waited 11.3 seconds for a section nobody was near.
   * It reads the sections that stand above the day it completes now, and those alone: here the hourly one.
   */
  it('ne relit au pas suivant que les rubriques qui n’atteignent pas la journée à compléter', async () => {
    const { result } = await firstStepRead();
    jest.mocked(content.getFeed).mockClear();
    await reachEnd(result.current.onEndReached);
    await waitFor(() => {
      expect(result.current.items.length).toBeGreaterThan(41);
    });
    expect(jest.mocked(content.getFeed).mock.calls.map(([query]) => query)).toEqual([
      { section: HARD, cursor: String(SERVICE_PAGES.section) },
    ]);
    expect(content.getLiveFeed).toHaveBeenCalledTimes(1);
  });

  /**
   * Read to the end, the run holds every article of every section once, newest first — and it took seven pages, each
   * section's own and no more: the three of the hourly one, two of each of the others. Read in step, three sections
   * one page deeper each time, it took nine, and the rare section's second page came with the first step after it.
   */
  it('lit le journal jusqu’au bout, chaque article une fois, en ne demandant que les pages qu’il faut', async () => {
    const { result } = await firstStepRead();
    for (let step = 0; step < 10 && result.current.foot.kind !== 'failed'; step += 1) {
      await reachEnd(result.current.onEndReached);
      await waitFor(() => {
        expect(result.current.foot.kind).toBe('none');
      });
    }
    const every = [...lists.values()].flat();
    const drawn = result.current.items;
    expect(drawn).toHaveLength(every.length);
    expect(new Set(drawn.map((item) => item.id)).size).toBe(every.length);
    expect(drawn.map((item) => item.publishedAt)).toEqual(
      every.map((item) => item.publishedAt).sort((left, right) => right.localeCompare(left)),
    );
    expect(content.getFeed).toHaveBeenCalledTimes(7);
  });

  /**
   * The list asks again whenever its end comes near, and that is not a sign the step it asked for before has landed:
   * asked twice, the second asking would drop the first on its way and send its readings out again.
   */
  it('ne redemande pas le pas qui est en route', async () => {
    const { result } = await firstStepRead();
    jest.mocked(content.getFeed).mockClear();
    jest.mocked(content.getFeed).mockImplementation(never);
    await reachEnd(result.current.onEndReached);
    await waitFor(() => {
      expect(result.current.foot.kind).toBe('coming');
    });
    await reachEnd(result.current.onEndReached);
    expect(content.getFeed).toHaveBeenCalledTimes(1);
  });

  /** The hourly section stops at 13:00 on the 24th: the step on its way completes the 24th, and says so. */
  it('nomme au pied la journée que le pas en route complète', async () => {
    const { result } = await firstStepRead();
    expect(result.current.foot).toEqual({ kind: 'none' });
    jest.mocked(content.getFeed).mockImplementation(never);
    await reachEnd(result.current.onEndReached);
    await waitFor(() => {
      expect(result.current.foot).toEqual({ kind: 'coming', day: paris('2026-09-24 00:00') });
    });
  });

  /**
   * A part that failed left the reader at the last item for good: the list asks again only once it has grown. The
   * foot says why, the items above it stay, and asking again from it reads the step anew.
   */
  it('dit au pied pourquoi la suite n’est pas venue, et la redemande', async () => {
    const { result } = await firstStepRead();
    const shown = result.current.items.length;
    jest.mocked(content.getFeed).mockRejectedValue(new ContentApiError('offline', 'hors ligne'));
    await reachEnd(result.current.onEndReached);
    await waitFor(() => {
      expect(result.current.foot).toEqual({ kind: 'failed', failure: 'offline' });
    });
    expect(result.current.items).toHaveLength(shown);
    jest.mocked(content.getFeed).mockImplementation(served);
    await reachEnd(result.current.onEndReached);
    await waitFor(() => {
      expect(result.current.items.length).toBeGreaterThan(shown);
    });
    expect(result.current.foot).toEqual({ kind: 'none' });
  });

  /** Asked again, the step is on its way again, and the foot says so rather than the failure it is answering. */
  it('redit que la suite vient quand on la redemande après un échec', async () => {
    const { result } = await firstStepRead();
    jest.mocked(content.getFeed).mockRejectedValue(new ContentApiError('offline', 'hors ligne'));
    await reachEnd(result.current.onEndReached);
    await waitFor(() => {
      expect(result.current.foot.kind).toBe('failed');
    });
    jest.mocked(content.getFeed).mockImplementation(never);
    await reachEnd(result.current.onEndReached);
    await waitFor(() => {
      expect(result.current.foot).toEqual({ kind: 'coming', day: paris('2026-09-24 00:00') });
    });
  });

  /**
   * A phone that ran the build before this one holds steps of another shape — one floor and one cursor for every
   * section — in the cache it wrote to disk, and the contracts' hash that clears that cache did not change with them.
   * Read as steps of this shape, they had no reach to read.
   */
  it('ne lit pas comme ses pas ceux qu’une build d’avant a laissés sur le disque', async () => {
    const before = { pages: [{ read: [], floor: null, nextCursor: '30' }], pageParams: [''] };
    const { result } = await renderHookWithCache(
      () => useArticleStream(SECTIONS),
      [[['articles', 'stream', SECTIONS.join(' ')], before]],
    );
    await waitFor(() => {
      expect(result.current.items.length).toBeGreaterThan(0);
    });
    expect(content.getFeed).toHaveBeenCalledTimes(SECTIONS.length);
  });
});
