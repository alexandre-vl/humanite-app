import { ARTICLE, ARTICLE_SUMMARY, ContentApiError, ISSUE_SUMMARY, issueIdAt, SERVICE_PAGES } from '@huma/contracts';
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
import type { CorpusArticle } from '@huma/mock-content';

const summarize = (article: Article): ArticleSummary => ARTICLE_SUMMARY.parse(article);

/**
 * Every item of the corpus, newest first — the order a section's list, the wire and a search present, and the order
 * the corpus lays its front in, having no desk to lay it otherwise. The app bundles this module, so it runs on Hermes,
 * which has no `Array.prototype.toSorted`: a copy sorted in place says the same thing to both engines.
 */
const NEWEST_FIRST: readonly CorpusArticle[] = [...CORPUS].sort((left, right) =>
  right.publishedAt.localeCompare(left.publishedAt),
);

/** The same items as the feeds hand them out: as summaries, which carry no section, the service's carrying none. */
const CHRONOLOGICAL: readonly ArticleSummary[] = NEWEST_FIRST.map(summarize);

const notFound = (id: ArticleId): never => {
  throw new ContentApiError('not-found', `article introuvable : ${id}`);
};

/**
 * What a run of the corpus's items opens on: the first of them with a picture, or the first of them when none has one.
 *
 * A paper opens on a picture, and the corpus has no desk to choose one: laid out newest first, its newest items of a
 * morning are the briefs filed before there is a picture — four of them on its front. So the corpus lays its own front
 * and its numéros' covers by this one rule, and the screens show what they are served in the order they are served
 * it, as they show the journal's.
 */
const openerOf = (items: readonly ArticleSummary[]): ArticleSummary | undefined =>
  items.find((item) => item.hero !== undefined) ?? items[0];

/** A run of items with the one it opens on laid first, and everything else as it came. */
const openedOn = (items: readonly ArticleSummary[]): readonly ArticleSummary[] => {
  const opener = openerOf(items);
  return opener === undefined ? items : [opener, ...items.filter((item) => item.id !== opener.id)];
};

/** The front of the corpus: its newest items, as many as the journal's front holds, opened on a picture. */
const FRONT: readonly ArticleSummary[] = openedOn(CHRONOLOGICAL.slice(0, SERVICE_PAGES.front));

/**
 * The corpus gathered into numéros, one per day on the newsroom's clock.
 *
 * Nothing in the corpus says which numéro an item belongs to, and nothing should: a daily paper's numéro *is* its day,
 * so the day an item was filed on already says it. Inventing a field would be inventing an editorial decision the
 * fiction never made, and would let the two disagree.
 *
 * Only the cover of a numéro is gathered now. What a numéro holds was served too, laid out desk by desk as a printed
 * edition runs them, and no screen ever asked: a numéro weighs sixty-two megabytes and is read in its publisher's own
 * reader, so the newsstand shows the covers and sends a reader to the paper's own site.
 */
const days = new Map<IssueId, ArticleSummary[]>();
for (const summary of CHRONOLOGICAL) {
  const day = issueIdAt(summary.publishedAt);
  days.set(day, [...(days.get(day) ?? []), summary]);
}

/** The shelf: every numéro, the most recent first, as the newsstand stands them. */
const SHELF: readonly IssueSummary[] = [...days]
  .map(([day, items]) => ISSUE_SUMMARY.parse({ id: day, opener: openerOf(items), count: items.length }))
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

const find = (id: ArticleId): Article => ARTICLE.parse(CORPUS.find((each) => each.id === id) ?? notFound(id));

/**
 * An article as a reader who holds no subscription is given it: whole when it is free, its body withheld when it is not.
 *
 * That is the reader the app is today: nobody signs in, and the journal's service, which answers `right: false` on
 * every reserved item it lists to such a reader, serves the body to subscribers alone. The mock is that reader too, so
 * what a reserved article shows is what the app will show of one — its head, and the call to subscribe.
 */
const asAnonymous = (article: Article): Article =>
  article.access === 'premium' ? { ...article, body: { kind: 'withheld' } } : article;

/**
 * The content the corpus serves, as the app's door reads it. It answers at once and never fails: a test that wants a
 * screen to see a failure hands the screen a failing read of its own, and what a screen does while it waits is shown
 * by holding a promise open, not by sleeping. It shelves numéros, gathered from its own days, which a source need not.
 */
export const contentApi: ContentApi & Required<Pick<ContentApi, 'getIssues'>> = {
  getSections: async (): Promise<readonly Section[]> => Promise.resolve(SECTIONS),
  getFeed: async (query: FeedQuery): Promise<Page<ArticleSummary>> => {
    const { section } = query;
    return Promise.resolve(
      section === undefined
        ? whole(FRONT, SERVICE_PAGES.front)
        : pageOf(
            NEWEST_FIRST.filter((entry) => entry.section === section).map(summarize),
            query,
            SERVICE_PAGES.section,
          ),
    );
  },
  getLiveFeed: async (): Promise<Page<ArticleSummary>> => Promise.resolve(whole(CHRONOLOGICAL, SERVICE_PAGES.wire)),
  getArticle: async (id: ArticleId): Promise<Article> => Promise.resolve(asAnonymous(find(id))),
  getIssues: async (): Promise<readonly IssueSummary[]> => Promise.resolve(SHELF),
  search: async (query: SearchQuery): Promise<Page<ArticleSummary>> => {
    const needle = fold(query.text.trim());
    return Promise.resolve(
      pageOf(
        INDEXED.filter((indexed) => indexed.searchable.includes(needle)).map((indexed) => indexed.summary),
        query,
        SERVICE_PAGES.search,
      ),
    );
  },
};
