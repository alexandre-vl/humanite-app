import type { ArticleSummary, IssueId } from '@huma/contracts';
import { INSTANT, issueIdAt } from '@huma/contracts';
import { describe, expect, it } from '@jest/globals';
import { content } from '#api';
import { formatDayHead, formatDayLabel } from '#lib/format';
import { everyArticle } from '#lib/testing';
import { rowKey, rowKind, rowPins, wireRows } from './wire';

/**
 * A wire reaching back over several days: the whole paper, the newest first, as a wire read that deep would list it.
 * The wire the source serves holds one evening, which could not show where one day gives way to the next.
 */
const deepWire = async (): Promise<readonly ArticleSummary[]> =>
  [...(await everyArticle(content))].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));

/** The day the newest item of `items` came out on, which is the day a reader reading it as it comes out is on. */
const dayOfNewest = (items: readonly ArticleSummary[]): IssueId => {
  const [newest] = items;
  if (newest === undefined) {
    throw new Error('le fil ne tient aucun article : le test ne vérifierait rien');
  }
  return issueIdAt(newest.publishedAt);
};

/** The wire's lines for `items`, read on the day its newest item came out. */
const readToday = (items: readonly ArticleSummary[], since: ArticleSummary['publishedAt'] | null = null) =>
  wireRows(items, dayOfNewest(items), since);

describe('wireRows', () => {
  // The wire opened on the newest illustrated item, printed the width of the screen with its title over the picture,
  // and left it out of the list below. It is a card of the front page, and this screen has no front page: what is at
  // the top of a wire is at the top because it is the newest.
  it('liste chaque item du fil, sans en réserver un à une ouverture', async () => {
    const items = await deepWire();
    const listed = readToday(items).flatMap((row) => (row.kind === 'item' ? [row.summary.id] : []));
    expect(listed).toEqual(items.map((item) => item.id));
  });

  it('coiffe chaque journée d’un seul en-tête, sur un fil de plusieurs jours', async () => {
    const items = await deepWire();
    const headed = readToday(items).flatMap((row) => (row.kind === 'day' ? [row.day] : []));
    expect(headed).toEqual([...new Set(items.map((item) => issueIdAt(item.publishedAt)))]);
    expect(headed.length).toBeGreaterThan(1);
  });

  it('range chaque item sous la journée que son en-tête annonce', async () => {
    const items = await deepWire();
    const rows = readToday(items);
    let heading = '';
    let filed = 0;
    for (const row of rows) {
      if (row.kind === 'day') {
        heading = row.day;
        expect(row.label).toBe(formatDayHead(INSTANT.parse(`${row.day}T12:00:00.000Z`), dayOfNewest(items)));
      }
      if (row.kind === 'item') {
        expect(issueIdAt(row.summary.publishedAt)).toBe(heading);
        filed += 1;
      }
    }
    // Counted, because a loop over nothing asserts nothing: a wire that stopped rendering rows would pass in silence.
    expect(filed).toBeGreaterThan(1);
  });

  /**
   * A reader at the top of the wire could not tell it was the top: the head over it gave the day's date, and a reader
   * does not always know what the date is (25/09/2026). The head of the day they are on says so.
   */
  it('nomme « Aujourd’hui » la journée du lecteur, « Hier » la veille, et les autres par leur date', async () => {
    const items = await deepWire();
    const labels = (today: IssueId): readonly string[] =>
      wireRows(items, today).flatMap((row) => (row.kind === 'day' ? [row.label] : []));
    const [newest] = items;
    if (newest === undefined) {
      throw new Error('le fil ne tient aucun article : le test ne vérifierait rien');
    }
    const after = (days: number): IssueId =>
      issueIdAt(INSTANT.parse(new Date(Date.parse(newest.publishedAt) + days * 86_400_000).toISOString()));
    expect(labels(dayOfNewest(items))[0]).toBe('Aujourd\u2019hui');
    expect(labels(after(1))[0]).toBe('Hier');
    expect(labels(after(2))[0]).toBe(formatDayLabel(newest.publishedAt));
  });

  /** A wire that holds nothing is a screen that has to say so, and the list has no other line to say it on. */
  it('tient lieu du fil lui-même quand le fil ne rend rien', () => {
    expect(wireRows([], issueIdAt(INSTANT.parse('2026-09-25T12:00:00.000Z')))).toEqual([{ kind: 'standIn' }]);
  });
});

describe('les lignes du fil', () => {
  it('portent chacune un nom distinct', async () => {
    const keys = readToday(await deepWire()).map(rowKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('n’épinglent que les en-têtes de journée', async () => {
    const pinned = new Set(
      readToday(await deepWire())
        .filter(rowPins)
        .map(rowKind),
    );
    expect([...pinned]).toEqual(['day']);
  });

  it('nomment un arbre par sorte de ligne', async () => {
    const kinds = [...new Set(readToday(await deepWire()).map(rowKind))];
    expect(kinds.sort((left, right) => left.localeCompare(right))).toEqual(['day', 'item']);
  });
});

describe('ce qui est nouveau au lecteur', () => {
  /** Whether each item of the wire is new, in the wire's order. */
  const freshness = (rows: ReturnType<typeof wireRows>): readonly boolean[] =>
    rows.flatMap((row) => (row.kind === 'item' ? [row.fresh] : []));

  /**
   * Said of each item filed since the reader last looked, and of no other. The wire drew one line across the run
   * instead, and a reader could not tell whether its words spoke of the item under them or of the whole run
   * (25/09/2026).
   */
  it('dit nouveau chaque article paru depuis le dernier regard, et nul autre', async () => {
    const items = await deepWire();
    const since = items[3];
    if (since === undefined) {
      throw new Error('le fil tient moins de quatre articles : le test ne vérifierait rien');
    }
    const fresh = freshness(readToday(items, since.publishedAt));
    expect(fresh).toEqual(items.map((item) => item.publishedAt > since.publishedAt));
    expect(fresh.filter(Boolean).length).toBeGreaterThan(0);
    expect(fresh.filter((each) => !each).length).toBeGreaterThan(0);
  });

  it('ne dit rien de nouveau à la première visite, ni quand rien n’est paru depuis', async () => {
    const items = await deepWire();
    const [newest] = items;
    if (newest === undefined) {
      throw new Error('le fil ne tient aucun article : le test ne vérifierait rien');
    }
    expect(freshness(readToday(items)).some(Boolean)).toBe(false);
    expect(freshness(readToday(items, newest.publishedAt)).some(Boolean)).toBe(false);
  });
});
