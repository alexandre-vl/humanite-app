import type { ArticleId, ArticleSummary } from '@huma/contracts';
import { openerOf, pictureOf } from './picture';

/**
 * The trees a feed card mounts, one name per shape the cards take.
 *
 * These name what is rendered, never what an item editorially is: a list hands a cell to another item only when both
 * answer the same name, and two items that mount different components under one name would leave the wrong views
 * behind. So the paper's own words — a brief, a column — appear here only where they really do change the tree.
 */
export type CardShape = 'lead' | 'stacked' | 'line' | 'column' | 'brief';

/** Which of the two grounds a block of the feed is printed on. */
type FeedGround = 'paper' | 'lifted';

/**
 * What kind of feed is being laid out, which is what its rhythm follows.
 *
 * A page of the paper opens on one article in full and alternates the ground under the blocks that follow. A list is
 * what a reader asked for — a search, their own bookmarks — and answers in the order asked, every item on one line,
 * because a rank in a list of answers is the answer's, not the paper's, and dressing the first one as a front page
 * would say the newsroom chose it (captures 09 and 17).
 */
export type FeedRhythm = 'paper' | 'list';

/** One row of a feed: a card, or the seam where one block of cards gives way to the next. */
export type FeedRow =
  | Readonly<{ kind: 'card'; shape: CardShape; ground: FeedGround; summary: ArticleSummary }>
  | Readonly<{ kind: 'seam'; ground: FeedGround; opens: ArticleId }>;

/** How many cards a block holds before the ground changes under them. */
const BLOCK = 3;

/**
 * Which block a rank falls in. The opening article is a block of its own, so the runs that follow it all start on a
 * card of the same shape rather than one beginning a beat late.
 */
const blockOf = (rank: number): number => (rank === 0 ? 0 : 1 + Math.floor((rank - 1) / BLOCK));

/**
 * The shape an item takes at its rank.
 *
 * What the item is comes first: a column is a column wherever it falls, and an item written without a picture cannot
 * be given one by its place in the page. Only then does the rank speak, and only on a page of the paper — which opens
 * on one article in full, then opens each block on a stacked card and runs it on in lines.
 */
const shapeAt = (summary: ArticleSummary, rank: number, rhythm: FeedRhythm): CardShape => {
  if (summary.format === 'column') {
    return 'column';
  }
  if (pictureOf(summary, 'card') === null) {
    return 'brief';
  }
  if (rhythm === 'list') {
    return 'line';
  }
  if (rank === 0) {
    return 'lead';
  }
  return (rank - 1) % BLOCK === 0 ? 'stacked' : 'line';
};

/**
 * The order a page of the paper reads in: the article it opens on first, then everything else as it came.
 *
 * The feed arrives newest first, and the newest items of a morning are the briefs filed before the desk has pictures
 * — four of them, the day this was written. A page that took its rank alone would open on a brief and never once
 * print the front it is named after, so the front is chosen rather than found in place. Nothing else moves.
 */
const paperOrder = (summaries: readonly ArticleSummary[]): readonly ArticleSummary[] => {
  const opener = openerOf(summaries);
  if (opener === undefined) {
    return summaries;
  }
  return [opener, ...summaries.filter((summary) => summary.id !== opener.id)];
};

/**
 * The rows a feed shows, in order: every item as a card, and — on a page of the paper — a seam wherever the ground
 * changes under them.
 *
 * The shape is decided once, here, and never by a screen: a screen that chose a card would have to know the rhythm of
 * every other screen to keep one, and the list would be handed two items answering the same name that mount different
 * trees. What a screen still decides is which rhythm it is reading in, and what pressing a card does.
 *
 * A rank is the item's place in the feed as it stands, so a page appended at the end never moves an item already
 * read. Removing one does move every item under it, and a cell whose shape changed is thrown away and mounted again;
 * that is the price of a rhythm the page can be read by, and only the bookmarks a reader empties ever pay it.
 */
export const feedRows = (summaries: readonly ArticleSummary[], rhythm: FeedRhythm): readonly FeedRow[] => {
  const ordered = rhythm === 'paper' ? paperOrder(summaries) : summaries;
  const rows: FeedRow[] = [];
  let drawn = -1;
  for (const [rank, summary] of ordered.entries()) {
    const shape = shapeAt(summary, rank, rhythm);
    if (rhythm === 'list') {
      rows.push({ kind: 'card', shape, ground: 'paper', summary });
      continue;
    }
    const block = blockOf(rank);
    const ground: FeedGround = block % 2 === 0 ? 'paper' : 'lifted';
    if (block !== drawn) {
      drawn = block;
      if (rank > 0) {
        rows.push({ kind: 'seam', ground, opens: summary.id });
      }
    }
    rows.push({ kind: 'card', shape, ground, summary });
  }
  return rows;
};

/** What tells one row of a feed from another for the list: each shape mounts its own tree, and only its own. */
export const rowShape = (row: FeedRow): string => (row.kind === 'seam' ? 'seam' : row.shape);

/** The name a row keeps for as long as it is in the feed. */
export const rowName = (row: FeedRow): string => (row.kind === 'seam' ? `seam:${row.opens}` : row.summary.id);
