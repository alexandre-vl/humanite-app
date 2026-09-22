import { ARTICLE_SUMMARY } from '@huma/contracts';
import type { ArticleSummary } from '@huma/contracts';
import { describe, expect, it } from '@jest/globals';
import { content, pictureOf } from '#api';
import { feedRows, rowName, rowShape } from './rhythm';

/** The whole corpus, which is what a rhythm has to hold over. */
const everything = async (): Promise<readonly ArticleSummary[]> => (await content.getFeed({ limit: 100 })).items;

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
    const shown = feedRows(items, 'paper').map((row) => row.summary.id);
    expect(shown).toEqual([front.id, ...items.filter((item) => item.id !== front.id).map((item) => item.id)]);
  });

  /**
   * The corpus files four briefs ahead of the first picture, so a page that took its rank alone would open on a
   * brief and the front page would never once be printed. This is the test that would have caught that.
   */
  it('ouvre sur un article en grand, et c’est un article illustré', async () => {
    const rows = feedRows(await everything(), 'paper');
    const [lead] = rows;
    if (lead === undefined) {
      throw new Error('le journal ne sert aucun article : le test ne vérifierait rien');
    }
    expect(lead.shape).toBe('lead');
    expect(pictureOf(lead.summary, 'card')).not.toBeNull();
  });

  /**
   * A page raises an article every so often and runs the rest on one line, which is the whole of its rhythm now that
   * the two grounds are gone. What is asked is that the rhythm exist at all and that it stay a rhythm: several of
   * them down a page of seventy-two items, and never two in a row — a run of large cards is not a rhythm, it is a
   * page that has forgotten it had one.
   */
  it('relève un article en grand de loin en loin, et jamais deux de suite', async () => {
    const rows = feedRows(await everything(), 'paper');
    const raised = rows.flatMap((row, rank) => (row.shape === 'lead' ? [rank] : []));
    expect(raised.length).toBeGreaterThan(2);
    for (const [index, rank] of raised.entries()) {
      expect(rank - (raised[index - 1] ?? rank - 2)).toBeGreaterThan(1);
    }
  });

  /**
   * A column is a column wherever it falls. The corpus files three of them at ranks the rhythm would otherwise have
   * given another shape, which is the whole point of asking the item before asking its place.
   */
  it('garde sa carte à une chronique où qu’elle tombe', async () => {
    const items = await everything();
    expect(items.filter((item) => item.format === 'column').length).toBeGreaterThan(0);
    for (const row of feedRows(items, 'paper')) {
      expect(row.shape === 'column').toBe(row.summary.format === 'column');
    }
  });

  it('ne demande jamais d’image à un article qui n’en a pas', async () => {
    for (const row of feedRows(await everything(), 'paper')) {
      const illustrated = pictureOf(row.summary, 'card') !== null;
      expect(row.shape === 'brief').toBe(!illustrated && row.summary.format !== 'column');
      expect(['lead', 'line'].includes(row.shape)).toBe(illustrated);
    }
  });

  it('sert un fil trop court pour tourner, et un fil vide', async () => {
    const one = (await everything()).filter((item) => item.hero !== undefined).slice(0, 1);
    expect(feedRows(one, 'paper')).toEqual([{ shape: 'lead', summary: one[0] }]);
    expect(feedRows([], 'paper')).toEqual([]);
  });
});

describe('feedRows, rythme d’une liste', () => {
  /**
   * A list answers in the order it was asked in: a reader who searched sees the best answer first, and nothing the
   * newsroom did to a page may reorder that. Nor does a list raise anything — it is not a page (capture 09).
   */
  it('répond dans l’ordre reçu, sans une', async () => {
    const items = await everything();
    const rows = feedRows(items, 'list');
    expect(rows.map(rowName)).toEqual(items.map((item) => item.id));
    expect(rows.some((row) => rowShape(row) === 'lead')).toBe(false);
  });

  it('met en ligne tout ce qui porte une image, et garde le reste tel quel', async () => {
    for (const row of feedRows(await everything(), 'list')) {
      const expected =
        row.summary.format === 'column' ? 'column' : pictureOf(row.summary, 'card') === null ? 'brief' : 'line';
      expect(row.shape).toBe(expected);
    }
  });
});

describe('rowShape et rowName', () => {
  it('donnent un nom propre à chaque rangée, et le nom de sa forme', async () => {
    const rows = feedRows(await everything(), 'paper');
    expect(new Set(rows.map(rowName)).size).toBe(rows.length);
    expect(new Set(rows.map(rowShape))).toEqual(new Set(['lead', 'line', 'column', 'brief']));
  });
});

/**
 * The blocker the picture of the journal removed, held from the screen's side. An item of the journal named its
 * picture by an address, which the contract could not hold until it could hold either source; until then every one
 * of them reached this module bare, came out a brief, and a page of the real paper would never once have opened on
 * a picture — with no parse anywhere failing to say so.
 */
describe('feedRows, sur un article du journal illustré', () => {
  it('lui donne une carte illustrée, et non celle d’une brève', async () => {
    const [sample] = await everything();
    if (sample === undefined) {
      throw new Error('le journal ne sert aucun article : le test ne vérifierait rien');
    }
    const url = 'https://www.humanite.fr/wp-content/uploads/2026/09/x.jpg?w=1200';
    const filed = ARTICLE_SUMMARY.parse({ ...sample, id: '3861029', hero: { picture: { kind: 'journal', url } } });
    const [row] = feedRows([filed], 'paper');
    expect(row?.shape).toBe('lead');
    expect(pictureOf(filed, 'card')).toEqual({ source: { uri: url.replace('w=1200', 'w=1080') } });
  });
});
