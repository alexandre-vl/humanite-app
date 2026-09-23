import { ARTICLE_SUMMARY, ContentApiError, ISSUE_SUMMARY, issueIdAt } from '@huma/contracts';
import type {
  Article,
  ArticleId,
  ArticleSummary,
  ContentApi,
  FeedQuery,
  IssueId,
  IssueSummary,
  Page,
  PageQuery,
  SearchQuery,
  Section,
} from '@huma/contracts';
import { CORPUS, SECTIONS } from '@huma/mock-content';

/**
 * How much each list answers at once: what the journal's service answered in the capture of 21/09/2026, so every
 * screen runs on the mock at the geometry of the paper it will read. The front and the wire come in one answer each,
 * the service having never been seen to page either; a section's own list and a search come thirty and ten at a time.
 */
const PAGE_SIZES = { front: 13, wire: 10, section: 30, search: 10 } as const;

const summarize = (article: Article): ArticleSummary => ARTICLE_SUMMARY.parse(article);

/**
 * Every summary, newest first — the order a section's list, the wire and a search present, and the order the corpus
 * lays its front in, having no desk to lay it otherwise. The app bundles this module, so it runs on Hermes, which has
 * no `Array.prototype.toSorted`: a copy sorted in place says the same thing to both engines.
 */
const CHRONOLOGICAL: readonly ArticleSummary[] = [...CORPUS.map(summarize)].sort((left, right) =>
  right.publishedAt.localeCompare(left.publishedAt),
);

const notFound = (id: ArticleId): never => {
  throw new ContentApiError('not-found', `article introuvable : ${id}`);
};

/** A day's paper while it is being gathered: what it holds, and what it will open on. */
type Gathering = Readonly<{ items: ArticleSummary[] }> & { opener: ArticleSummary };

/**
 * The corpus gathered into numéros, one per day on the newsroom's clock.
 *
 * Nothing in the corpus says which numéro an item belongs to, and nothing should: a daily paper's numéro *is* its day,
 * so the day an item was filed on already says it. Inventing a field would be inventing an editorial decision the
 * fiction never made, and would let the two disagree.
 *
 * The opener is the freshest illustrated item of the day, which is the same rule the front page follows — a paper opens
 * on a picture, and the newest items of a morning are briefs filed before the desk has one. A day holding no picture
 * at all opens on its freshest item, so every numéro has a cover.
 *
 * Only the cover of a numéro is gathered now. What a numéro holds was served too, laid out desk by desk as a printed
 * edition runs them, and no screen ever asked: a numéro weighs sixty-two megabytes and is read in its publisher's own
 * reader, so the newsstand shows the covers and sends a reader to the paper's own site.
 */
const gathered = new Map<IssueId, Gathering>();
for (const summary of CHRONOLOGICAL) {
  const day = issueIdAt(summary.publishedAt);
  const held = gathered.get(day);
  if (held === undefined) {
    gathered.set(day, { items: [summary], opener: summary });
  } else {
    held.items.push(summary);
    if (held.opener.hero === undefined && summary.hero !== undefined) {
      held.opener = summary;
    }
  }
}

/** The shelf: every numéro, the most recent first, as the newsstand stands them. */
const SHELF: readonly IssueSummary[] = [...gathered]
  .map(([day, held]) => ISSUE_SUMMARY.parse({ id: day, opener: held.opener, count: held.items.length }))
  .sort((left, right) => right.id.localeCompare(left.id));

/**
 * A text as search compares it: no case, no accents, no ligature. French is written with them and searched without —
 * a reader who types `ecole` means `école`, and on this corpus 643 of the 3 346 words of the titles and standfirsts
 * carry an accent. Hermes has both `normalize('NFD')` and the `\p{…}` escapes this needs, measured in the app itself
 * (journal 0a, vérification 15).
 *
 * `œ` is spelt out first because NFD leaves it whole: it is one letter, not an `o` wearing a mark. The corpus writes
 * it eight times — cœur, œil, œuvre, vœux — and nothing at all with `æ`, which is why only one ligature is named.
 */
const fold = (text: string): string => text.toLowerCase().split('œ').join('oe').normalize('NFD').replace(/\p{M}/gu, '');

/** A summary beside the text search reads it by, folded once rather than once per query. */
type Indexed = Readonly<{ summary: ArticleSummary; searchable: string }>;

/**
 * What search looks through: the title and the standfirst of every article, and nothing of the body. The body is not
 * in a summary at all, so searching it would mean holding the whole corpus a second time.
 */
const INDEXED: readonly Indexed[] = CHRONOLOGICAL.map((summary) => ({
  summary,
  searchable: fold([summary.title, summary.standfirst].join(' ')),
}));

/** The page of `items` a cursor opens — an offset, minted here and nowhere else — `size` items long. */
const pageOf = (items: readonly ArticleSummary[], query: PageQuery, size: number): Page<ArticleSummary> => {
  const parsed = query.cursor === undefined ? 0 : Number.parseInt(query.cursor, 10);
  const offset = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
  const next = offset + size;
  return { items: items.slice(offset, next), nextCursor: next < items.length ? String(next) : null };
};

/** A list that comes in one answer, whatever cursor is handed: it has no next page to open. */
const whole = (items: readonly ArticleSummary[], size: number): Page<ArticleSummary> => ({
  items: items.slice(0, size),
  nextCursor: null,
});

const find = (id: ArticleId): Article => CORPUS.find((each) => each.id === id) ?? notFound(id);

/**
 * The content the corpus serves, as the app's door reads it. It answers at once and never fails: a test that wants a
 * screen to see a failure hands the screen a failing read of its own, and what a screen does while it waits is shown
 * by holding a promise open, not by sleeping.
 */
export const contentApi: ContentApi = {
  getSections: async (): Promise<readonly Section[]> => Promise.resolve(SECTIONS),
  getFeed: async (query: FeedQuery): Promise<Page<ArticleSummary>> => {
    const { section } = query;
    return Promise.resolve(
      section === undefined
        ? whole(CHRONOLOGICAL, PAGE_SIZES.front)
        : pageOf(
            CHRONOLOGICAL.filter((summary) => summary.section === section),
            query,
            PAGE_SIZES.section,
          ),
    );
  },
  getLiveFeed: async (): Promise<Page<ArticleSummary>> => Promise.resolve(whole(CHRONOLOGICAL, PAGE_SIZES.wire)),
  getArticle: async (id: ArticleId): Promise<Article> => Promise.resolve(find(id)),
  getIssues: async (): Promise<readonly IssueSummary[]> => Promise.resolve(SHELF),
  search: async (query: SearchQuery): Promise<Page<ArticleSummary>> => {
    const needle = fold(query.text.trim());
    return Promise.resolve(
      pageOf(
        INDEXED.filter((indexed) => indexed.searchable.includes(needle)).map((indexed) => indexed.summary),
        query,
        PAGE_SIZES.search,
      ),
    );
  },
};
