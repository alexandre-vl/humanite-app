import type { ArticleSummary } from '@huma/contracts';
import { issueIdAt } from '@huma/contracts';
import { describe, expect, it } from '@jest/globals';
import { content } from '#api';
import { formatDayLabel } from '#lib/format';
import { rowKey, rowKind, rowPins, wireRows } from './wire';

/** The first two pages of the wire, which is what a reader who scrolls once has read. */
const twoPages = async (): Promise<readonly ArticleSummary[]> => {
  const first = await content.getLiveFeed({});
  if (first.nextCursor === null) {
    throw new Error('le fil tient sur une seule page : le test ne prouverait rien sur les bornes de page');
  }
  const second = await content.getLiveFeed({ cursor: first.nextCursor });
  return [...first.items, ...second.items];
};

/** The item the wire opens on, worked out beside the code under test rather than by it. */
const openerOf = (items: readonly ArticleSummary[]): ArticleSummary | undefined =>
  items.find((item) => item.hero !== undefined);

describe('wireRows', () => {
  it('ouvre le fil sur l’item illustré le plus récent', async () => {
    const items = await twoPages();
    const [opener] = wireRows(items);
    expect(opener?.kind).toBe('hero');
    expect(opener?.kind === 'hero' ? opener.summary.id : null).toBe(openerOf(items)?.id);
  });

  it('ne liste pas une seconde fois l’item sur lequel il ouvre', async () => {
    const items = await twoPages();
    const listed = wireRows(items).flatMap((row) => (row.kind === 'item' ? [row.summary.id] : []));
    expect(listed).not.toContain(openerOf(items)?.id);
    expect(listed).toHaveLength(items.length - 1);
  });

  it('coiffe chaque journée d’un seul en-tête, par-dessus les bornes de page', async () => {
    const items = await twoPages();
    const opener = openerOf(items);
    const headed = wireRows(items).flatMap((row) => (row.kind === 'day' ? [row.day] : []));
    const listed = items.filter((item) => item.id !== opener?.id);
    expect(headed).toEqual([...new Set(listed.map((item) => issueIdAt(item.publishedAt)))]);
    expect(headed.length).toBeGreaterThan(1);
  });

  it('range chaque item sous la journée que son en-tête annonce', async () => {
    const rows = wireRows(await twoPages());
    let heading = '';
    let filed = 0;
    for (const row of rows) {
      if (row.kind === 'day') {
        heading = row.day;
        expect(row.label).toBe(formatDayLabel(`${row.day}T12:00:00.000Z`));
      }
      if (row.kind === 'item') {
        expect(issueIdAt(row.summary.publishedAt)).toBe(heading);
        filed += 1;
      }
    }
    // Counted, because a loop over nothing asserts nothing: a wire that stopped rendering rows would pass in silence.
    expect(filed).toBeGreaterThan(1);
  });

  it('ne rend rien d’un fil vide', () => {
    expect(wireRows([])).toEqual([]);
  });
});

describe('les lignes du fil', () => {
  it('portent chacune un nom distinct', async () => {
    const keys = wireRows(await twoPages()).map(rowKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('n’épinglent que les en-têtes de journée', async () => {
    const pinned = new Set(
      wireRows(await twoPages())
        .filter(rowPins)
        .map(rowKind),
    );
    expect([...pinned]).toEqual(['day']);
  });

  it('nomment trois arbres, un par sorte de ligne', async () => {
    const kinds = [...new Set(wireRows(await twoPages()).map(rowKind))];
    expect(kinds.sort((left, right) => left.localeCompare(right))).toEqual(['day', 'hero', 'item']);
  });
});
