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

/** Every summary, newest first — the order feeds and search present. */
const CHRONOLOGICAL: readonly ArticleSummary[] = CORPUS.map(summarize).toSorted((left, right) =>
  right.publishedAt.localeCompare(left.publishedAt),
);

const matches = (summary: ArticleSummary, query: string): boolean => {
  const needle = query.toLowerCase();
  return (
    summary.title.toLowerCase().includes(needle) ||
    summary.standfirst.toLowerCase().includes(needle) ||
    summary.tags.some((tag) => tag.toLowerCase().includes(needle))
  );
};

const page = (items: readonly ArticleSummary[], cursor: string | undefined, limit: number): Page<ArticleSummary> => {
  const parsed = cursor === undefined ? 0 : Number.parseInt(cursor, 10);
  const offset = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
  const size = limit > 0 ? limit : DEFAULT_LIMIT;
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

  const find = (id: ArticleId): Article => {
    const article = CORPUS.find((each) => each.id === id);
    if (article === undefined) {
      throw new ContentApiError('not-found', `article introuvable : ${id}`);
    }
    return article;
  };

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
      return page(inSection(query.section), query.cursor, query.limit ?? DEFAULT_LIMIT);
    },
    getLiveFeed: async (query: LiveQuery): Promise<Page<ArticleSummary>> => {
      await guard('getLiveFeed');
      return page(CHRONOLOGICAL, query.cursor, query.limit ?? DEFAULT_LIMIT);
    },
    getArticle: async (id: ArticleId): Promise<Article> => {
      await guard('getArticle');
      return find(id);
    },
    search: async (query: SearchQuery): Promise<Page<ArticleSummary>> => {
      await guard('search');
      return page(
        CHRONOLOGICAL.filter((summary) => matches(summary, query.text)),
        query.cursor,
        query.limit ?? DEFAULT_LIMIT,
      );
    },
    getSession: async (): Promise<Session> => {
      await guard('getSession');
      return session;
    },
  };
};
