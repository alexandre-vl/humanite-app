import { ARTICLE_SUMMARY, ContentApiError } from '@huma/contracts';
import type {
  Article,
  ArticleId,
  ArticleSummary,
  Author,
  ContentApi,
  ContentErrorCode,
  FeedQuery,
  LiveQuery,
  Page,
  SearchQuery,
  Section,
  SectionId,
  Session,
} from '@huma/contracts';
import { AUTHORS, CORPUS, SECTIONS } from '@huma/mock-content';

const DEFAULT_LIMIT = 12;

const summarize = (article: Article): ArticleSummary => ARTICLE_SUMMARY.parse(article);

/**
 * Every summary, newest first — the order feeds and search present. The app bundles this module, so it runs on Hermes,
 * which has no `Array.prototype.toSorted`: a copy sorted in place says the same thing to both engines.
 */
const CHRONOLOGICAL: readonly ArticleSummary[] = [...CORPUS.map(summarize)].sort((left, right) =>
  right.publishedAt.localeCompare(left.publishedAt),
);

/** The same summaries, reachable by id: a related block names ids, and resolves them without pulling whole bodies. */
const SUMMARIES = new Map(CHRONOLOGICAL.map((summary): readonly [ArticleId, ArticleSummary] => [summary.id, summary]));

const notFound = (id: ArticleId): never => {
  throw new ContentApiError('not-found', `article introuvable : ${id}`);
};

/**
 * A text as search compares it: no case, no accents, no ligature. French is written with them and searched without —
 * a reader who types `ecole` means `école`, and on this corpus 45 of the 117 subjects carry an accent. Hermes has both
 * `normalize('NFD')` and the `\p{…}` escapes this needs, measured in the app itself (journal 0a, vérification 15).
 *
 * `œ` is spelt out first because NFD leaves it whole: it is one letter, not an `o` wearing a mark. The corpus writes
 * it eight times — cœur, œil, œuvre, vœux — and nothing at all with `æ`, which is why only one ligature is named.
 */
const fold = (text: string): string => text.toLowerCase().split('œ').join('oe').normalize('NFD').replace(/\p{M}/gu, '');

/** A summary beside the text search reads it by, folded once rather than once per query. */
type Indexed = Readonly<{ summary: ArticleSummary; searchable: string }>;

/**
 * What search looks through: the title, the standfirst and the subjects of every article, and nothing of the body. The
 * body is not in a summary at all, so searching it would mean holding the whole corpus a second time.
 */
const INDEXED: readonly Indexed[] = CHRONOLOGICAL.map((summary) => ({
  summary,
  searchable: fold([summary.title, summary.standfirst, ...summary.tags].join(' ')),
}));

const page = (
  items: readonly ArticleSummary[],
  cursor: string | undefined,
  limit: number | undefined,
): Page<ArticleSummary> => {
  const parsed = cursor === undefined ? 0 : Number.parseInt(cursor, 10);
  const offset = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
  const size = limit !== undefined && limit > 0 ? limit : DEFAULT_LIMIT;
  const next = offset + size;
  return {
    items: items.slice(offset, next),
    nextCursor: next < items.length ? String(next) : null,
    total: items.length,
  };
};

/** Options that make the mock testable: a session, a caller-provided delay, and injected failures. */
export type MockApiOptions = Readonly<{
  session?: Session;
  latency?: number;
  delay?: (ms: number) => Promise<void>;
  fail?: Partial<Record<keyof ContentApi, ContentErrorCode>>;
}>;

/** A content api backed by the fictional corpus, with optional latency and injectable errors. */
export const createContentApi = (options: MockApiOptions = {}): ContentApi => {
  const session: Session = options.session ?? { isSubscriber: false };
  const latency = options.latency ?? 0;
  const { delay, fail } = options;

  const guard = async (method: keyof ContentApi): Promise<void> => {
    if (latency > 0 && delay !== undefined) {
      await delay(latency);
    }
    const code = fail?.[method];
    if (code !== undefined) {
      throw new ContentApiError(code, `échec simulé de ${method}`);
    }
  };

  const inSection = (section: SectionId | undefined): readonly ArticleSummary[] =>
    section === undefined ? CHRONOLOGICAL : CHRONOLOGICAL.filter((summary) => summary.section === section);

  const find = (id: ArticleId): Article => CORPUS.find((each) => each.id === id) ?? notFound(id);

  const summaryOf = (id: ArticleId): ArticleSummary => SUMMARIES.get(id) ?? notFound(id);

  return {
    getSections: async (): Promise<readonly Section[]> => {
      await guard('getSections');
      return SECTIONS;
    },
    getAuthors: async (): Promise<readonly Author[]> => {
      await guard('getAuthors');
      return AUTHORS;
    },
    getFeed: async (query: FeedQuery): Promise<Page<ArticleSummary>> => {
      await guard('getFeed');
      return page(inSection(query.section), query.cursor, query.limit);
    },
    getLiveFeed: async (query: LiveQuery): Promise<Page<ArticleSummary>> => {
      await guard('getLiveFeed');
      return page(CHRONOLOGICAL, query.cursor, query.limit);
    },
    getArticle: async (id: ArticleId): Promise<Article> => {
      await guard('getArticle');
      return find(id);
    },
    getSummaries: async (ids: readonly ArticleId[]): Promise<readonly ArticleSummary[]> => {
      await guard('getSummaries');
      return ids.map(summaryOf);
    },
    search: async (query: SearchQuery): Promise<Page<ArticleSummary>> => {
      await guard('search');
      const needle = fold(query.text.trim());
      return page(
        INDEXED.filter((indexed) => indexed.searchable.includes(needle)).map((indexed) => indexed.summary),
        query.cursor,
        query.limit,
      );
    },
    getSession: async (): Promise<Session> => {
      await guard('getSession');
      return session;
    },
  };
};
