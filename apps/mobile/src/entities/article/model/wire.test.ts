import type { ArticleSummary } from '@huma/contracts';
import { INSTANT, issueIdAt } from '@huma/contracts';
import { describe, expect, it } from '@jest/globals';
import { content } from '#api';
import { formatDayLabel } from '#lib/format';
import { everyArticle } from '#lib/testing';
import { rowKey, rowKind, rowPins, wireRows } from './wire';

/**
 * A wire reaching back over several days: the whole paper, the newest first, as a wire read that deep would list it.
 * The wire the source serves holds one evening, which could not show where one day gives way to the next.
 */
const deepWire = async (): Promise<readonly ArticleSummary[]> =>
  [...(await everyArticle(content))].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));

describe('wireRows', () => {
  // The wire opened on the newest illustrated item, printed the width of the screen with its title over the picture,
  // and left it out of the list below. It is a card of the front page, and this screen has no front page: what is at
  // the top of a wire is at the top because it is the newest.
  it('liste chaque item du fil, sans en réserver un à une ouverture', async () => {
    const items = await deepWire();
    const listed = wireRows(items).flatMap((row) => (row.kind === 'item' ? [row.summary.id] : []));
    expect(listed).toEqual(items.map((item) => item.id));
  });

  it('coiffe chaque journée d’un seul en-tête, sur un fil de plusieurs jours', async () => {
    const items = await deepWire();
    const headed = wireRows(items).flatMap((row) => (row.kind === 'day' ? [row.day] : []));
    expect(headed).toEqual([...new Set(items.map((item) => issueIdAt(item.publishedAt)))]);
    expect(headed.length).toBeGreaterThan(1);
  });

  it('range chaque item sous la journée que son en-tête annonce', async () => {
    const rows = wireRows(await deepWire());
    let heading = '';
    let filed = 0;
    for (const row of rows) {
      if (row.kind === 'day') {
        heading = row.day;
        expect(row.label).toBe(formatDayLabel(INSTANT.parse(`${row.day}T12:00:00.000Z`)));
      }
      if (row.kind === 'item') {
        expect(issueIdAt(row.summary.publishedAt)).toBe(heading);
        filed += 1;
      }
    }
    // Counted, because a loop over nothing asserts nothing: a wire that stopped rendering rows would pass in silence.
    expect(filed).toBeGreaterThan(1);
  });

  /** A wire that holds nothing is a screen that has to say so, and the list has no other line to say it on. */
  it('tient lieu du fil lui-même quand le fil ne rend rien', () => {
    expect(wireRows([])).toEqual([{ kind: 'standIn' }]);
  });
});

describe('les lignes du fil', () => {
  it('portent chacune un nom distinct', async () => {
    const keys = wireRows(await deepWire()).map(rowKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('n’épinglent que les en-têtes de journée', async () => {
    const pinned = new Set(
      wireRows(await deepWire())
        .filter(rowPins)
        .map(rowKind),
    );
    expect([...pinned]).toEqual(['day']);
  });

  it('nomment un arbre par sorte de ligne', async () => {
    const kinds = [...new Set(wireRows(await deepWire()).map(rowKind))];
    expect(kinds.sort((left, right) => left.localeCompare(right))).toEqual(['day', 'item']);
  });
});

describe('la ligne de la dernière visite', () => {
  /** The newest item the wire had shown at the last visit: the fourth of the paper, so three came out since. */
  const lastSeen = async (): Promise<Readonly<{ items: readonly ArticleSummary[]; since: ArticleSummary }>> => {
    const items = await deepWire();
    const since = items[3];
    if (since === undefined) {
      throw new Error('le fil tient moins de quatre articles : le test ne vérifierait rien');
    }
    return { items, since };
  };

  /** Split around the line: what stands over it, and what stands under it. */
  const aroundLine = (rows: readonly ReturnType<typeof wireRows>[number][]) => {
    const line = rows.findIndex((row) => row.kind === 'visit');
    const summaries = (part: typeof rows) => part.flatMap((row) => (row.kind === 'item' ? [row.summary] : []));
    return { line, over: summaries(rows.slice(0, line)), under: summaries(rows.slice(line + 1)) };
  };

  it('sépare ce qui est paru depuis la dernière visite de ce qui l’était déjà, une seule fois', async () => {
    const { items, since } = await lastSeen();
    const rows = wireRows(items, since.publishedAt);
    const { over, under } = aroundLine(rows);
    expect(rows.filter((row) => row.kind === 'visit')).toHaveLength(1);
    expect(over.length).toBeGreaterThan(0);
    expect(over.every((item) => item.publishedAt > since.publishedAt)).toBe(true);
    expect(under.every((item) => item.publishedAt <= since.publishedAt)).toBe(true);
    expect(under[0]?.id).toBe(items.find((item) => item.publishedAt <= since.publishedAt)?.id);
    const keys = rows.map(rowKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  /** A day's head stays with its items: the line goes above it, not between it and the first of them. */
  it('passe au-dessus de l’en-tête de la journée qu’ouvre le premier article déjà paru', async () => {
    const items = await deepWire();
    const opener = items.find(
      (item) => issueIdAt(item.publishedAt) !== issueIdAt(items[0]?.publishedAt ?? item.publishedAt),
    );
    if (opener === undefined) {
      throw new Error('le fil tient une seule journée : le test ne vérifierait rien');
    }
    const rows = wireRows(items, opener.publishedAt);
    const { line } = aroundLine(rows);
    expect(rows[line + 1]).toEqual({
      kind: 'day',
      day: issueIdAt(opener.publishedAt),
      label: formatDayLabel(opener.publishedAt),
    });
  });

  it('ne trace rien à la première visite, ni quand rien n’est paru depuis, ni avant d’être lu jusque-là', async () => {
    const items = await deepWire();
    const newest = items[0];
    const oldest = items.at(-1);
    if (newest === undefined || oldest === undefined) {
      throw new Error('le fil ne tient aucun article : le test ne vérifierait rien');
    }
    const lines = (since: ArticleSummary['publishedAt'] | null): number =>
      wireRows(items, since).filter((row) => row.kind === 'visit').length;
    expect(lines(null)).toBe(0);
    expect(lines(newest.publishedAt)).toBe(0);
    expect(lines(INSTANT.parse(new Date(Date.parse(oldest.publishedAt) - 60_000).toISOString()))).toBe(0);
  });
});
