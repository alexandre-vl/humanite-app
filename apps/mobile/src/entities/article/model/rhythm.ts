import type { ArticleSummary } from '@huma/contracts';
import { pictureOf } from '#api';
import { frameOf, isColumn } from './format';

/**
 * The trees a feed card mounts, one name per shape the cards take.
 *
 * These name what is rendered, never what an item editorially is: a list hands a cell to another item only when both
 * answer the same name, and two items that mount different components under one name would leave the wrong views
 * behind. So the paper's own words — a brief, a column — appear here only where they really do change the tree.
 *
 * All five are one order — picture, what the item is, title, standfirst, when and whether it may be read — and differ
 * in which of those parts they carry and how large: Nielsen's rule for a grid of cards is to keep the internal
 * template identical so a reader learns it once, and to let a variation carry meaning. `stacked`, a shape since
 * removed, broke it: it put the title above the picture and the standfirst under it, so two cards a scroll apart
 * taught two orders for the same four things.
 *
 * `opening` is the card a page opens on, and the one card that keeps its standfirst: a `lead` with the sentence under
 * its title, whole. `lead` is a card the page raises further down, and a film wherever it falls, at the same size and
 * without it.
 */
export type CardShape = 'opening' | 'lead' | 'line' | 'column' | 'brief';

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
const LEAD_EVERY = 4;

/**
 * The shape an item takes at its rank.
 *
 * What the item is comes first: a column is a column wherever it falls, an item written without a picture cannot be
 * given one by its place in the page, and a film is shown at its own width. The still of a film is sixteen by nine,
 * and the journal's carry their titles printed on them: cut to the square beside a line, they lost half a face and
 * half a word on every row (« ENTION / CAINE », on the phone). Only then does the rank speak, and only on a page of
 * the paper — which opens on one article in full, raises another every fourth item, and runs everything between them
 * on one line.
 *
 * The article a page opens on is asked before its picture: it opens the page with or without one, the card simply
 * holding no picture when the item has none, and a film opens it in its own frame.
 */
const shapeAt = (summary: ArticleSummary, rank: number, rhythm: FeedRhythm): CardShape => {
  if (isColumn(summary.format)) {
    return 'column';
  }
  if (rhythm === 'paper' && rank === 0) {
    return 'opening';
  }
  if (pictureOf(summary, 'card') === null) {
    return 'brief';
  }
  if (frameOf(summary.format) === 'film') {
    return 'lead';
  }
  if (rhythm === 'list') {
    return 'line';
  }
  return rank % LEAD_EVERY === 0 ? 'lead' : 'line';
};

/**
 * The rows a feed shows, in the order the source gave them: every item as a card, in the shape its rank and its own
 * nature give it. The order is the desk's, and a feed does not rearrange a front the newsroom laid out.
 *
 * The shape is decided once, here, and never by a screen: a screen that chose a card would have to know the rhythm of
 * every other screen to keep one, and the list would be handed two items answering the same name that mount different
 * trees. What a screen still decides is which rhythm it is reading in, and what pressing a card does.
 *
 * A rank is the item's place in the feed as it stands, so a page appended at the end never moves an item already
 * read. Removing one does move every item under it, and a cell whose shape changed is thrown away and mounted again;
 * that is the price of a rhythm the page can be read by, and only the bookmarks a reader empties ever pay it.
 */
export const feedRows = (summaries: readonly ArticleSummary[], rhythm: FeedRhythm): readonly FeedRow[] =>
  summaries.map((summary, rank) => ({ shape: shapeAt(summary, rank, rhythm), summary }));

/** What tells one row of a feed from another for the list: each shape mounts its own tree, and only its own. */
export const rowShape = (row: FeedRow): string => row.shape;

/** The name a row keeps for as long as it is in the feed. */
export const rowName = (row: FeedRow): string => row.summary.id;
