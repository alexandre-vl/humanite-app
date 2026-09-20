import type { ArticleSummary } from '@huma/contracts';
import { describe, expect, it } from '@jest/globals';
import { content, pictureOf } from '#api';
import type { FeedRow } from './rhythm';
import { feedRows, rowName, rowShape } from './rhythm';

/** The whole corpus, which is what a rhythm has to hold over. */
const everything = async (): Promise<readonly ArticleSummary[]> => (await content.getFeed({ limit: 100 })).items;

/** The cards of a set of rows, in order, without the seams between their blocks. */
const cardsOf = (rows: readonly FeedRow[]): readonly Extract<FeedRow, { kind: 'card' }>[] =>
  rows.flatMap((row) => (row.kind === 'card' ? [row] : []));

/** The article a page should open on, worked out beside the code under test rather than by it. */
const frontOf = (items: readonly ArticleSummary[]): ArticleSummary | undefined =>
  items.find((item) => item.hero !== undefined);

describe('feedRows, rythme du journal', () => {
  it('montre chaque article une fois, la une montée en tête', async () => {
    const items = await everything();
    const front = frontOf(items);
    if (front === undefined) {
      throw new Error('aucun article illustré : le test ne vérifierait rien');
    }
    const shown = cardsOf(feedRows(items, 'paper')).map((row) => row.summary.id);
    expect(shown).toEqual([front.id, ...items.filter((item) => item.id !== front.id).map((item) => item.id)]);
  });

  /**
   * The corpus files four briefs ahead of the first picture, so a page that took its rank alone would open on a
   * brief and the front page would never once be printed. This is the test that would have caught that.
   */
  it('ouvre sur un seul article en grand, et c’est un article illustré', async () => {
    const cards = cardsOf(feedRows(await everything(), 'paper'));
    const [lead] = cards;
    if (lead === undefined) {
      throw new Error('le journal ne sert aucun article : le test ne vérifierait rien');
    }
    expect(cards.filter((row) => row.shape === 'lead')).toHaveLength(1);
    expect(lead.shape).toBe('lead');
    expect(pictureOf(lead.summary, 'card')).not.toBeNull();
  });

  /**
   * A column is a column wherever it falls. The corpus files three of them at ranks the rhythm would otherwise have
   * given another shape, which is the whole point of asking the item before asking its place.
   */
  it('garde sa carte à une chronique où qu’elle tombe', async () => {
    const items = await everything();
    expect(items.filter((item) => item.format === 'column').length).toBeGreaterThan(0);
    for (const row of cardsOf(feedRows(items, 'paper'))) {
      expect(row.shape === 'column').toBe(row.summary.format === 'column');
    }
  });

  it('ne demande jamais d’image à un article qui n’en a pas', async () => {
    for (const row of cardsOf(feedRows(await everything(), 'paper'))) {
      const illustrated = pictureOf(row.summary, 'card') !== null;
      expect(row.shape === 'brief').toBe(!illustrated && row.summary.format !== 'column');
      expect(['lead', 'stacked', 'line'].includes(row.shape)).toBe(illustrated);
    }
  });

  /**
   * The alternation is the paper's signature, and a seam is the only thing that says where it turns. Reading the
   * rows back is how a block is defined at all: a run of cards on one ground, between two seams.
   */
  it('change de fond à chaque bloc, et pose une couture à chaque changement', async () => {
    const rows = feedRows(await everything(), 'paper');
    let ground = rows[0]?.ground;
    let turns = 0;
    for (const row of rows.slice(1)) {
      if (row.ground !== ground) {
        expect(row.kind).toBe('seam');
        ground = row.ground;
        turns += 1;
      }
    }
    expect(turns).toBeGreaterThan(2);
    expect(rows.filter((row) => row.kind === 'seam')).toHaveLength(turns);
  });

  it('ne pose de couture ni en tête ni en pied', async () => {
    const rows = feedRows(await everything(), 'paper');
    expect(rows[0]?.kind).toBe('card');
    expect(rows.at(-1)?.kind).toBe('card');
  });

  it('sert un fil trop court pour tourner, et un fil vide', async () => {
    const one = (await everything()).filter((item) => item.hero !== undefined).slice(0, 1);
    expect(feedRows(one, 'paper')).toEqual([{ kind: 'card', shape: 'lead', ground: 'paper', summary: one[0] }]);
    expect(feedRows([], 'paper')).toEqual([]);
  });
});

describe('feedRows, rythme d’une liste', () => {
  /**
   * A list answers in the order it was asked in: a reader who searched sees the best answer first, and nothing the
   * newsroom did to a page may reorder that. Nor does a list alternate its ground — it is not a page (capture 09).
   */
  it('répond dans l’ordre reçu, sans une et sans couture', async () => {
    const items = await everything();
    const rows = feedRows(items, 'list');
    expect(rows.map(rowName)).toEqual(items.map((item) => item.id));
    expect(rows.every((row) => row.kind === 'card' && row.ground === 'paper')).toBe(true);
    expect(rows.some((row) => rowShape(row) === 'lead')).toBe(false);
    expect(rows.some((row) => rowShape(row) === 'stacked')).toBe(false);
  });

  it('met en ligne tout ce qui porte une image, et garde le reste tel quel', async () => {
    for (const row of cardsOf(feedRows(await everything(), 'list'))) {
      const expected =
        row.summary.format === 'column' ? 'column' : pictureOf(row.summary, 'card') === null ? 'brief' : 'line';
      expect(row.shape).toBe(expected);
    }
  });
});

describe('rowShape et rowName', () => {
  it('donnent un nom propre à chaque rangée, couture comprise', async () => {
    const rows = feedRows(await everything(), 'paper');
    expect(new Set(rows.map(rowName)).size).toBe(rows.length);
    expect(new Set(rows.map(rowShape))).toEqual(new Set(['lead', 'stacked', 'line', 'column', 'brief', 'seam']));
  });

  /** Two rows that answer one shape must be the same kind of row, or a cell would come back holding the other. */
  it('ne donnent jamais un nom de carte à une couture', async () => {
    for (const row of feedRows(await everything(), 'paper')) {
      expect(rowShape(row) === 'seam').toBe(row.kind === 'seam');
    }
  });
});
