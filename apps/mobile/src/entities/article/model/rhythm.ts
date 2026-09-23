import type { ArticleSummary } from '@huma/contracts';
import { pictureOf } from '#api';
import { openerOf } from './picture';

/**
 * The trees a feed card mounts, one name per shape the cards take.
 *
 * These name what is rendered, never what an item editorially is: a list hands a cell to another item only when both
 * answer the same name, and two items that mount different components under one name would leave the wrong views
 * behind. So the paper's own words — a brief, a column — appear here only where they really do change the tree.
 *
 * There were five, and `stacked` was the fifth: the title, then the picture, then the standfirst under it. Reading
 * one after a `lead` meant learning a second order for the same four things, and what told them apart was not what
 * they were but where they fell. Le Monde runs a hundred and seven cards off one component, varying which parts are
 * present and never where they sit; Nielsen's own rule for a grid of cards is to keep the internal template identical
 * so a reader learns it once, and that variation must carry meaning rather than whimsy. The four left are one order —
 * picture, section, title, standfirst — at two sizes, with or without a picture, plus the one the paper itself marks.
 */
export type CardShape = 'lead' | 'line' | 'column' | 'brief';

/**
 * What kind of feed is being laid out, which is what its rhythm follows.
 *
 * A page of the paper opens on one article in full and raises another every few items. A list is what a reader asked
 * for — a search, their own bookmarks — and answers in the order asked, every item on one line, because a rank in a
 * list of answers is the answer's, not the paper's, and dressing the first one as a front page would say the newsroom
 * chose it (captures 09 and 17).
 */
export type FeedRhythm = 'paper' | 'list';

/** One row of a feed: an article, in the shape the feed's rhythm gave it. */
export type FeedRow = Readonly<{ shape: CardShape; summary: ArticleSummary }>;

/**
 * How many items a page of the paper runs before it raises another in full.
 *
 * It is a rhythm and no longer a container. There were two grounds under these blocks, taken in turn, with a seam
 * where one gave way to the other — a full-width band edge and a corner rounded over it every three cards. None of
 * the four fronts measured does anything of the kind: the Guardian, the BBC, Le Monde and NPR each print one ground
 * and separate with a hairline, and the Guardian's own container palettes are reserved for a container the desk has
 * marked, never for every third card. What the band actually said is what NN/g calls the illusion of completeness: a
 * contrasting full-width edge reads as the end of the page, and a reader stops there.
 */
const BLOCK = 4;

/**
 * The shape an item takes at its rank.
 *
 * What the item is comes first: a column is a column wherever it falls, and an item written without a picture cannot
 * be given one by its place in the page. Only then does the rank speak, and only on a page of the paper — which
 * raises one article in full at the top and again every fourth item, and runs everything between them on one line.
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
  return rank % BLOCK === 0 ? 'lead' : 'line';
};

/**
 * The order a page of the paper reads in: the article it opens on first, then everything else as it came.
 *
 * A page opens on a picture, and a feed need not start with one: the corpus lays its front out newest first, and the
 * newest items of a morning are the briefs filed before the desk has pictures — four of them there. A page that took
 * its rank alone would open on a brief and never once print the front it is named after, so the opener is chosen
 * rather than found in place; on a front whose desk already opens on a picture, it is the first item and nothing
 * moves. Nothing else moves either way.
 */
const paperOrder = (summaries: readonly ArticleSummary[]): readonly ArticleSummary[] => {
  const opener = openerOf(summaries);
  if (opener === undefined) {
    return summaries;
  }
  return [opener, ...summaries.filter((summary) => summary.id !== opener.id)];
};

/**
 * The rows a feed shows, in order: every item as a card, in the shape its rank and its own nature give it.
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
  return ordered.map((summary, rank) => ({ shape: shapeAt(summary, rank, rhythm), summary }));
};

/** What tells one row of a feed from another for the list: each shape mounts its own tree, and only its own. */
export const rowShape = (row: FeedRow): string => row.shape;

/** The name a row keeps for as long as it is in the feed. */
export const rowName = (row: FeedRow): string => row.summary.id;
