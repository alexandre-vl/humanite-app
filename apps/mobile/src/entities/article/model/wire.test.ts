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
